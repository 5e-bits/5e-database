import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Equipment from '../en/5e-SRD-Equipment.json' with { type: 'json' };
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

/** Monsters split into one monster per form, and how many forms each has. */
const formCounts: Record<string, number> = { werebear: 3, wereboar: 3, wererat: 3, weretiger: 3, werewolf: 3, vampire: 3 };

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
    const extraForms = Object.values(formCounts).reduce((total, forms) => total + forms - 1, 0);
    expect(generated).toHaveLength(Object.keys(source).filter((k) => k !== '_info').length + extraForms);
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

          const attackRoll = /Attack Roll: \+(\d+)/.exec(entry.desc);
          if (attackRoll && entry.attack_bonus !== Number(attackRoll[1])) errors.push(`${m.index} ${entry.name}: attack_bonus`);
          if (!attackRoll && entry.attack_bonus !== undefined) errors.push(`${m.index} ${entry.name}: unexpected attack_bonus`);
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('builds spellcasting for every entry that casts spells', () => {
    const spellUrls = new Set((Spells as { url: string }[]).map((spell) => spell.url));
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          if (!/spellcasting ability/.test(entry.desc) || !/^(While within 30 feet|(While [^,]+, )?[Tt]he [\w ]+ casts? )/.test(entry.desc)) continue;
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

  it('has a clean size and type, with no leaked "or small" text', () => {
    const errors: string[] = [];
    for (const m of generated) {
      if (/^(or|and) /.test(m.type as string)) errors.push(`${m.index}: type '${m.type}'`);
      if (/humanoid|undead|monstrosity/.test(m.size as string)) errors.push(`${m.index}: size '${m.size}'`);
    }
    expect(errors).toEqual([]);
  });

  it('has a complete languages string for every monster', () => {
    const errors: string[] = [];
    for (const m of generated) {
      if (m.languages === undefined) errors.push(`${m.index}: missing`);
      else if (/ (and|or|but|the|plus|with)$/.test(m.languages as string)) errors.push(`${m.index}: ${m.languages}`);
      else if (((m.languages as string).match(/\(/g) ?? []).length !== ((m.languages as string).match(/\)/g) ?? []).length) {
        errors.push(`${m.index}: unbalanced parens in '${m.languages}'`);
      }
    }
    expect(errors).toEqual([]);
  });

  it('never bleeds another stat block into a description', () => {
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          if (/MOD SAVE|Senses Passive Perception|CR [\d/]+ \(XP/.test(entry.desc)) {
            errors.push(`${m.index} ${entry.name}: ...${entry.desc.slice(-60)}`);
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('parses usage out of every recharge/per-day name suffix', () => {
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          if (/\((?:\d+\/Day|Recharge)[^)]*\)$/.test(entry.name) && !entry.usage) {
            errors.push(`${m.index}: ${entry.name}`);
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('has no PDF debris in entries', () => {
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          if (/^(At Will|\d+\/Day( Each)?)$/.test(entry.name)) errors.push(`${m.index} ${entry.name}: spell list entry`);
          if (/^(The target|Half damage|Failure|Success)/.test(entry.name)) errors.push(`${m.index} ${entry.name}: fragment entry`);
          if (!/[.):]$/.test(entry.desc.trim())) {
            errors.push(`${m.index} ${entry.name}: ...${entry.desc.slice(-40)}`);
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('structures every multiattack', () => {
    const errors: string[] = [];
    for (const m of generated) {
      for (const entry of (m.actions ?? []) as Monster[]) {
        if (/^Multiattack/.test(entry.name) && !entry.multiattack_type) errors.push(`${m.index}: ${entry.desc}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it('keeps counts for simple multiattack descriptions', () => {
    const errors: string[] = [];
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
    for (const m of generated) {
      for (const entry of (m.actions ?? []) as Monster[]) {
        const match = /^The [\w -]+ makes (\w+) ([A-Z][a-z’']+(?: [A-Z][a-z’']+)*) attacks\.$/.exec(entry.desc);
        if (!match || !entry.multiattack_type) continue;
        const [item] = entry.actions ?? [];
        if (entry.actions?.length !== 1 || item.count !== words[match[1]] || item.action_name !== match[2]) {
          errors.push(`${m.index}: ${entry.desc}`);
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('splits form monsters and links their forms', () => {
    const indices = new Set(generated.map((m) => m.index));
    const errors: string[] = [];
    for (const base of Object.keys(formCounts)) {
      if (indices.has(base)) errors.push(`${base}: unsplit monster still present`);
      const forms = generated.filter((m) => m.forms && m.index.startsWith(`${base}-`) && m.index !== `${base}-spawn`);
      if (forms.length !== formCounts[base]) errors.push(`${base}: ${forms.length} forms`);
      for (const form of forms) {
        const linked = (form.forms as { index: string; url: string }[]).map((f) => f.index).sort();
        const others = forms.map((f) => f.index).filter((i) => i !== form.index).sort();
        if (JSON.stringify(linked) !== JSON.stringify(others)) errors.push(`${form.index}: forms ${linked}`);
        if (linked.some((i) => !indices.has(i))) errors.push(`${form.index}: broken form link`);
      }
    }
    expect(errors).toEqual([]);
  });

  it('keeps only the entries a form has', () => {
    const errors: string[] = [];
    for (const m of generated) {
      for (const section of entrySections) {
        for (const entry of (m[section] ?? []) as Monster[]) {
          if (/Form Only\)/.test(entry.name) && m.index !== 'mimic') errors.push(`${m.index}: ${entry.name}`);
        }
      }
    }
    const werewolfHuman = generated.find((m) => m.index === 'werewolf-human');
    const werewolfWolf = generated.find((m) => m.index === 'werewolf-wolf');
    expect((werewolfHuman?.actions as Monster[]).map((a) => a.name)).toEqual(['Multiattack', 'Scratch', 'Longbow']);
    expect((werewolfWolf?.actions as Monster[]).map((a) => a.name)).toEqual(['Multiattack', 'Bite', 'Scratch']);
    expect(werewolfWolf?.speed).toEqual({ walk: '40 ft.' });
    expect(werewolfHuman?.speed).toEqual({ walk: '30 ft.' });
    expect(errors).toEqual([]);
  });

  it('links worn armor and shields from gear to equipment', () => {
    const equipmentUrls = new Set((Equipment as { url: string }[]).map((item) => item.url));
    const errors: string[] = [];
    for (const m of generated) {
      const [armorClass] = m.armor_class as { type?: string; armor?: { url: string }[] }[];
      if (armorClass.type !== undefined) errors.push(`${m.index}: has armor type`);
      const linked = (armorClass.armor ?? []).map((a) => a.url);
      if (linked.some((url) => !equipmentUrls.has(url))) errors.push(`${m.index}: broken armor link`);

      const worn = String(m.gear ?? '')
        .split(', ')
        .filter((item) => /Armor|Shirt|Mail|Breastplate|Shield/.test(item));
      if (worn.length !== linked.length) errors.push(`${m.index}: gear ${worn} linked ${linked}`);
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

  it('has no skills string; skills live in proficiencies instead', () => {
    const errors = generated.filter((m) => 'skills' in m);
    expect(errors.map((m) => m.index)).toEqual([]);
  });

  it('has skill proficiency values of ability mod + PB, or + 2 x PB with expertise', () => {
    const skillAbilityBySlug = Object.fromEntries(
      Object.entries(skillAbility).map(([name, ability]) => [`skill-${name.toLowerCase().replace(/ /g, '-')}`, ability])
    );
    const errors: string[] = [];
    for (const m of generated) {
      if (skillQuirks.has(m.index)) continue;
      for (const entry of (m.proficiencies as { value: number; proficiency: { index: string; name: string } }[]).filter(
        (p) => p.proficiency.index.startsWith('skill-')
      )) {
        const ability = skillAbilityBySlug[entry.proficiency.index];
        const diff = entry.value - abilityMod(m[ability]);
        if (diff !== m.proficiency_bonus && diff !== 2 * m.proficiency_bonus) {
          errors.push(`${m.index}: ${entry.proficiency.name} +${entry.value} (mod ${abilityMod(m[ability])}, PB ${m.proficiency_bonus})`);
        }
      }
    }
    expect(errors).toEqual([]);
  });
});
