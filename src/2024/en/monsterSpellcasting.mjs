import fs from 'fs';
import { ENTRY_SECTIONS, SECTION_HEADING, abilityRef } from './monsterCommon.mjs';

const SPELL_USAGE = /^(At Will|(\d+)\/Day(?: Each)?):\s*(.*)$/;
const ENTRY_START = /^[^:]*?\. [A-Z]/;
const SINGLE_CAST_INTRO = /^(?:While within 30 feet of at least two hag allies, the hag can cast |(?:While [^,]+, )?[Tt]he [\w ]+ casts? )/;
const CAST_NAMES = /casts (?:the )?(.+?)(?: spell)?( on itself| twice)?,? (?:requiring|using|in response)/;
const COVEN_NAMES = /following spells,.*?: (.+?)\. /;
const REPLACEMENT_NAMES = /replace one (\w+) with (.+?)\./;
const NAME_SEPARATOR = /,\s*(?:or |and )?|\s+or\s+/;

const spells = JSON.parse(fs.readFileSync(new URL('./5e-SRD-Spells.json', import.meta.url), 'utf-8'));
const spellsByName = new Map(spells.map((spell)=>[spell.name.toLowerCase(), spell]));

export const findSpell = (name)=>spellsByName.get(name.toLowerCase().replace(/’/g, "'"));

/**
 * A wrapped spell list line continues until the next label, entry, section, or the
 * next stat block header (a name line followed by AC within a few lines).
 */
const continuesSpellList = (lines, index)=>
	Boolean(lines[index]?.trim())
	&& !SPELL_USAGE.test(lines[index])
	&& !SECTION_HEADING.test(lines[index])
	&& !ENTRY_START.test(lines[index])
	&& !(/^[A-Z][^,()]*$/.test(lines[index]) && lines.slice(index, index + 6).some((line)=>/^AC \d/.test(line)));

const parseSpellEntry = (entry)=>{
	const notes = entry.match(/\(([^)]*)\)/)?.[1];
	const name = entry.replace(/\s*\(.*\)/, '').trim();
	const spell = findSpell(name);
	if(!spell){ throw new Error(`Unknown spell '${name}'`); }

	const version = notes?.match(/^level (\d) version$/);
	const result = { index: spell.index, name: spell.name, level: version ? Number(version[1]) : spell.level, url: spell.url };
	if(notes && !version){ result.notes = `${notes[0].toUpperCase()}${notes.slice(1)}`; }
	return result;
};

/**
 * The PDF layout can place one stat block's spellcasting entry inside the previous block's
 * text, so lists are matched to entries by the intro's ability, save DC and to-hit bonus.
 */
const spellcastingKey = (text)=>{
	const intro = text.replace(/([a-z])- ([a-z])/g, '$1$2').replace(/\s+/g, ' ');
	const scoped = intro.slice(Math.max(0, intro.lastIndexOf('casts one of the following')));
	const ability = scoped.match(/(\w+) as (?:the )?spellcasting ability/)?.[1];
	const dc = scoped.match(/spell save DC (\d+)/)?.[1];
	const modifier = scoped.match(/\+(\d+) to hit with spell attacks/)?.[1];
	return `${ability}|${dc}|${modifier}`;
};

/**
 * Spell lists are not in the gist descriptions, so read them from the stat block text.
 * Returns one list per spellcasting entry, in stat block order.
 */
export const parseSpellLists = (data)=>{
	const lines = data.split('\n');
	const lists = [];
	let previousEnd = -2;

	for(let i = 0; i < lines.length; i++){
		const match = lines[i].match(SPELL_USAGE);
		if(!match){ continue; }

		if(i !== previousEnd + 1){ lists.push({ key: spellcastingKey(lines.slice(Math.max(0, i - 5), i).join(' ')), spells: [], used: false }); }

		let text = match[3];
		for(;;){
			let next = i + 1;
			const open = text.trim().endsWith(',') || (text.match(/\(/g) || []).length > (text.match(/\)/g) || []).length;
			while(open && lines[next] !== undefined && !lines[next].trim()){ next++; }
			if(!continuesSpellList(lines, next)){ break; }
			i = next;
			text += ` ${lines[i].trim()}`;
		}
		previousEnd = i;

		const usage = match[2] ? { type: 'per day', times: Number(match[2]) } : { type: 'at will' };
		text.replace(/([a-z])- ([a-z])/g, '$1$2').split(/,\s*(?![^()]*\))/).forEach((entry)=>{
			lists[lists.length - 1].spells.push({ ...parseSpellEntry(entry), usage });
		});
	}

	return lists;
};

const buildSpellcasting = (desc, spellList, main)=>{
	const components = new Set(['V', 'S', 'M']);
	const missing = desc.match(/requiring no (.+?) components/)?.[1];
	if(missing && /spell/.test(missing)){ components.clear(); }
	else if(missing){
		[['Verbal', 'V'], ['Somatic', 'S'], ['Material', 'M']].forEach(([word, letter])=>{
			if(missing.includes(word)){ components.delete(letter); }
		});
	}

	const abilityName = desc.match(/using (\w+) as (?:the )?spellcasting ability/)?.[1];
	const inherits = !abilityName && /the same spellcasting ability as Spellcasting/.test(desc);
	if(inherits && !main){ throw new Error(`No main Spellcasting to inherit from: ${desc}`); }

	const spellcasting = { ability: inherits ? main.ability : abilityRef(abilityName) };
	const dc = desc.match(/spell save DC (\d+)/)?.[1] ?? (inherits ? main.dc : undefined);
	const modifier = desc.match(/\+(\d+) to hit with spell attacks/)?.[1] ?? (inherits ? main.modifier : undefined);
	if(dc !== undefined){ spellcasting.dc = Number(dc); }
	if(modifier !== undefined){ spellcasting.modifier = Number(modifier); }
	return { ...spellcasting, components_required: [...components], spells: spellList };
};

/**
 * Entries that cast named spells inline, e.g. "casts Fear, using ...".
 */
const parseSingleCast = (entry)=>{
	const coven = entry.desc.match(COVEN_NAMES);
	const cast = coven ? null : entry.desc.match(CAST_NAMES);
	if(!coven && !cast){ throw new Error(`Cannot read cast spells: ${entry.desc}`); }

	const usage = entry.name.match(/\((\d+)\/Day[;)]/);
	const spellsCast = (coven ? coven[1] : cast[1]).split(NAME_SEPARATOR).map((name)=>({
		...parseSpellEntry(name),
		...(usage && { usage: { type: 'per day', times: Number(usage[1]) } })
	}));

	if(cast?.[2]?.trim() === 'on itself'){ spellsCast.forEach((spell)=>{ spell.notes = 'Self only'; }); }
	if(cast?.[2]?.trim() === 'twice'){ spellsCast[0].notes = 'Cast twice'; }

	const replacement = entry.desc.match(REPLACEMENT_NAMES);
	if(replacement){
		replacement[2].split(NAME_SEPARATOR).forEach((name)=>{
			spellsCast.push({ ...parseSpellEntry(name), notes: `Can replace one ${replacement[1]}` });
		});
	}

	return spellsCast;
};

/**
 * Add `spellcasting` to entries with a spell list, then to entries that cast named spells.
 */
export const addSpellcasting = (result, monsterText, textData)=>{
	const nearbyLists = [textData[monsterText.position - 1], monsterText, textData[monsterText.position + 1]].flatMap((data)=>data?.spellLists ?? []);

	ENTRY_SECTIONS.forEach((key)=>{
		(result[key] || []).forEach((entry)=>{
			if(!/casts one of the following spells.*as (?:the )?spellcasting ability/.test(entry.desc)){ return; }

			const listKey = spellcastingKey(entry.desc);
			const spellList = nearbyLists.find((list)=>!list.used && list.key === listKey);
			if(!spellList){ throw new Error(`No spell list for ${result.index} ${entry.name} (${listKey})`); }
			spellList.used = true;
			entry.spellcasting = buildSpellcasting(entry.desc, spellList.spells);
		});
	});

	const main = ['special_abilities', 'actions'].flatMap((key)=>result[key] || []).find((entry)=>entry.spellcasting)?.spellcasting;

	ENTRY_SECTIONS.forEach((key)=>{
		(result[key] || []).forEach((entry)=>{
			if(entry.spellcasting || !/spellcasting ability/.test(entry.desc) || !SINGLE_CAST_INTRO.test(entry.desc)){ return; }
			entry.spellcasting = buildSpellcasting(entry.desc, parseSingleCast(entry), main);
		});
	});
};

export const assertAllSpellListsUsed = (textData)=>{
	const unusedLists = textData.flatMap((data)=>data.spellLists).filter((list)=>!list.used);
	if(unusedLists.length){
		throw new Error(`Unused spell lists: ${JSON.stringify(unusedLists.map((list)=>[list.key, list.spells[0].name]))}`);
	}
};
