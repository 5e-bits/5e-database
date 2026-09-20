import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Spells from '../en/5e-SRD-Spells.json' with { type: 'json' };
import { MonsterSchema } from '../schemas/5e-SRD-Monsters';

type Monster = Record<string, any>;

const enDir = path.resolve('src/2024/en');
const skillAbility: Record<string, string> = {
  Acrobatics: 'dexterity',
  'Animal Handling': 'wisdom',
  Arcana: 'intelligence',
  Athletics: 'strength',
  Deception: 'charisma',
  History: 'intelligence',
  Insight: 'wisdom',
  Intimidation: 'charisma',
  Investigation: 'intelligence',
  Medicine: 'wisdom',
  Nature: 'intelligence',
  Perception: 'wisdom',
  Performance: 'charisma',
  Persuasion: 'charisma',
  Religion: 'intelligence',
  'Sleight of Hand': 'dexterity',
  Stealth: 'dexterity',
  Survival: 'wisdom',
};

/** Skill bonuses that differ from mod + PB in the published book. */
const skillQuirks = new Set(['shambling-mound', 'giant-frog']);

const entrySections = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'];

const crToNumber = (cr: string) => (cr.includes('/') ? 1 / Number(cr.split('/')[1]) : Number(cr));
const abilityMod = (score: number) => Math.floor((score - 10) / 2);

let tmpDir: string;
let generated: Monster[];
let source: Record<string, unknown>;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monsters-'));
  const out = path.join(tmpDir, 'monsters.json');
  execFileSync('node', ['processMonsterData.mjs', out, path.join(tmpDir, 'normalized.txt')], { cwd: enDir, stdio: 'pipe' });
  generated = JSON.parse(fs.readFileSync(out, 'utf8'));
  source = JSON.parse(fs.readFileSync(path.join(enDir, 'monsters.json'), 'utf8'));
});

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

describe('generated 2024 monsters', () => {
  it('has one entry per source monster with unique indices', () => {
    expect(generated).toHaveLength(Object.keys(source).filter((k) => k !== '_info').length);
    expect(new Set(generated.map((m) => m.index)).size).toBe(generated.length);
  });

  it('matches the monster schema', () => {
    const errors = new Map<string, string[]>();
    for (const m of generated) {
      const r = MonsterSchema.safeParse(m);
      if (r.success) continue;
      for (const issue of r.error.issues) {
        const key = `${issue.code} ${issue.path.filter((p) => typeof p !== 'number').join('.')} ${'keys' in issue ? JSON.stringify(issue.keys) : ''}`;
        errors.set(key, [...(errors.get(key) ?? []), m.index]);
      }
    }
    expect([...errors].map(([key, indices]) => `${key} (${indices.length}, e.g. ${indices[0]})`)).toEqual([]);
  });

  it('has a well-formed hit point roll', () => {
    const errors = generated.filter((m) => !/^\d+d\d+( [+-] \d+)?$/.test(m.hit_points_roll));
    expect(errors.map((m) => `${m.index}: ${m.hit_points_roll}`)).toEqual([]);
  });

  it('has passive perception, and only known sense keys', () => {
    const errors = generated.filter(
      (m) =>
        typeof m.senses.passive_perception !== 'number' ||
        Number.isNaN(m.senses.passive_perception) ||
        Object.values(m.senses).some((v) => typeof v === 'string' && !/^\d+ ft\.( \([^)]*\))?$/.test(v))
    );
    expect(errors.map((m) => `${m.index}: ${m.old_senses}`)).toEqual([]);
  });

  it('extracts every saving throw DC and damage roll from descriptions', () => {
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          const save = /(\w+) Saving Throw: DC (\d+)/.exec(entry.desc);
          if (save && (entry.dc?.dc_value !== Number(save[2]) || entry.dc.dc_type.name !== save[1].slice(0, 3).toUpperCase())) {
            errors.push(`${m.index} ${entry.name}: dc`);
          }
          const rolls = entry.desc.match(/\d+ \(\d+d\d+[^)]*\) \w+ damage/g) ?? [];
          if (rolls.length !== (entry.damage?.length ?? 0)) errors.push(`${m.index} ${entry.name}: damage`);
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('builds spellcasting from every spell list entry', () => {
    const spellUrls = new Set((Spells as { url: string }[]).map((spell) => spell.url));
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          if (!/casts one of the following spells.*as (the )?spellcasting ability/.test(entry.desc)) continue;
          const spells = (entry.spellcasting?.spells ?? []) as { url: string }[];
          if (spells.length === 0) errors.push(`${m.index} ${entry.name}: no spells`);
          for (const spell of spells) {
            if (!spellUrls.has(spell.url)) errors.push(`${m.index} ${entry.name}: ${spell.url}`);
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('has XP for every monster above CR 0', () => {
    const errors = generated.filter((m) => m.challenge_rating > 0 && !(m.xp > 0));
    expect(errors.map((m) => `${m.index}: CR ${m.challenge_rating} XP ${m.xp}`)).toEqual([]);
  });

  it('has a proficiency bonus matching its challenge rating', () => {
    const errors = generated.filter(
      (m) => m.proficiency_bonus !== Math.max(2, Math.ceil(crToNumber(String(m.challenge_rating)) / 4) + 1)
    );
    expect(errors.map((m) => `${m.index}: CR ${m.challenge_rating} PB ${m.proficiency_bonus}`)).toEqual([]);
  });

  it('has skill bonuses of ability mod + PB, or + 2 x PB with expertise', () => {
    const errors: string[] = [];
    for (const m of generated) {
      if (!m.skills || skillQuirks.has(m.index)) continue;
      for (const entry of String(m.skills).split(/,\s*/)) {
        const match = /^(.+) \+(\d+)$/.exec(entry.trim());
        const ability = match && skillAbility[match[1]];
        if (!match || !ability) {
          errors.push(`${m.index}: unparseable skill '${entry}'`);
          continue;
        }
        const diff = Number(match[2]) - abilityMod(m[ability]);
        if (diff !== m.proficiency_bonus && diff !== 2 * m.proficiency_bonus) {
          errors.push(`${m.index}: ${entry} (mod ${abilityMod(m[ability])}, PB ${m.proficiency_bonus})`);
        }
      }
    }
    expect(errors).toEqual([]);
  });
});
