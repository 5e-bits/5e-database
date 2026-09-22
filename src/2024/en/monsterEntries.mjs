import { ENTRY_SECTIONS, SECTION_HEADING, abilityRef, flatten } from './monsterCommon.mjs';

const DAMAGE = /\d+ \((\d+d\d+(?: [+−–-] \d+)?)\) (\w+) damage/g;
const ATTACK_BONUS = /Attack Roll: \+(\d+)/;
const SAVE_DC = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+)/;
const ESCAPE_DC = /escape DC (\d+)/;
const CHECK_DC = /DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) \(/;
const VARIABLE_SAVE_DC = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw \(DC \d+ plus/;
const SPELL_LIST_ENTRY_NAME = /^(At Will|\d+\/Day(?: Each)?)$/;
const HEADING_NOTE = '\\d+\\/Day[^)]*|Recharge[^)]*|[^)]*Only';
const USAGE_HEADING = new RegExp(`^([A-Z][^.]{2,60}\\((?:${HEADING_NOTE})\\))\\.(?: |$)`);
const MERGED_HEADING = new RegExp(`\\. ([A-Z][^.]{2,60}\\((?:${HEADING_NOTE})\\))\\. `);
/** The ability-score table header, present verbatim at the start of every stat block. */
const ABILITY_TABLE = /SAVE\tMOD SAVE/;

/**
 * The gist keeps only the first damage roll, so read every damage type from the description.
 */
const parseDamage = (desc)=>[...desc.matchAll(DAMAGE)].map(([, dice, type])=>({
	damage_type: { index: type.toLowerCase(), name: type, url: `/api/2024/damage-types/${type.toLowerCase()}` },
	damage_dice: dice.replace(/ /g, '').replace(/[−–]/g, '-')
}));

const parseDc = (desc)=>{
	const save = desc.match(SAVE_DC);
	if(save){
		return { dc_type: abilityRef(save[1]), dc_value: Number(save[2]), success_type: /Success: Half damage/.test(desc) ? 'half' : 'none' };
	}
	const escape = desc.match(ESCAPE_DC);
	if(escape){
		return { dc_type: abilityRef('Str'), dc_value: Number(escape[1]), success_type: 'none' };
	}
	const check = desc.match(CHECK_DC);
	if(check){
		return { dc_type: abilityRef(check[2]), dc_value: Number(check[1]), success_type: 'none' };
	}
	const variable = desc.match(VARIABLE_SAVE_DC);
	if(variable){
		return { dc_type: abilityRef(variable[1]), success_type: 'none' };
	}
};

/**
 * Replace the gist's damage_dice / damage_bonus with parsed `damage`, and add `dc` and
 * `attack_bonus`. The gist's own attack_bonus is a spell-attack modifier on some casting
 * entries (already covered by spellcasting.modifier), never a weapon attack roll bonus, so
 * it is dropped rather than kept.
 */
export const addDamageAndDc = (result)=>{
	ENTRY_SECTIONS.forEach((key)=>{
		(result[key] || []).forEach((entry)=>{
			delete entry.damage_dice;
			delete entry.damage_bonus;
			delete entry.attack_bonus;

			const damage = parseDamage(entry.desc);
			if(damage.length){ entry.damage = damage; }

			const dc = parseDc(entry.desc);
			if(dc){ entry.dc = dc; }

			const attackBonus = entry.desc.match(ATTACK_BONUS);
			if(attackBonus){ entry.attack_bonus = Number(attackBonus[1]); }
		});
	});
};

/**
 * The gist runs the next stat block's title onto the last entry of a block.
 */
const stripTrailingTitle = (desc, blockTitles)=>{
	const title = blockTitles.find((candidate)=>desc.endsWith(` ${candidate}`) && /[.)]$/.test(desc.slice(0, -candidate.length - 1)));
	return title ? desc.slice(0, -title.length - 1) : desc;
};

/**
 * The gist truncates some entries at a page or column break. Take the rest from the stat
 * block text, and only when the gist text is an exact prefix of the text paragraph.
 */
const completeFromText = (entry, otherNames, lines)=>{
	const prefix = flatten(`${entry.name}. ${entry.desc}`);

	for(let start = 0; start < lines.length; start++){
		if(!flatten(lines[start]).startsWith(`${flatten(entry.name)}. `)){ continue; }

		let paragraph = lines[start];
		for(let next = start + 1; next < lines.length; next++){
			const line = flatten(lines[next]);
			if(SECTION_HEADING.test(lines[next]) || otherNames.some((name)=>line.startsWith(`${name}. `)) || USAGE_HEADING.test(lines[next])){ break; }
			if(/^[A-Z][^,()]*$/.test(lines[next]) && lines.slice(next, next + 9).some((after)=>/^AC \d/.test(after))){ break; }
			/**
			 * A block's title does not always sit close enough to its AC line for the check
			 * above to catch it (e.g. a group title with no AC/HP/Speed of its own follows it);
			 * the ability-score table is the one thing every stat block reliably starts with,
			 * so never accumulate past it even when the title itself went undetected.
			 */
			if(ABILITY_TABLE.test(lines[next])){ break; }
			paragraph += ` ${lines[next]}`;
		}

		const flat = flatten(paragraph);
		if(flat.startsWith(prefix)){
			return flat.slice(prefix.length).trim().replace(/'/g, '’');
		}
	}
};

/**
 * The gist sometimes folds an entry with a usage heading into the previous entry.
 */
const splitMergedEntry = (entry, lines)=>{
	const heading = entry.desc.match(MERGED_HEADING);
	if(!heading || !lines.some((line)=>flatten(line).startsWith(`${flatten(heading[1])}.`))){ return [entry]; }

	const at = entry.desc.indexOf(`${heading[1]}. `);
	return [
		{ ...entry, desc: entry.desc.slice(0, at).trim() },
		{ name: heading[1], desc: entry.desc.slice(at + heading[1].length + 2).trim() }
	];
};

/**
 * The gist sometimes cuts an entry at a "Failure:" or "Success:" and turns the rest into a fake
 * entry named after its first sentence. Real entries start their own line in the text; these
 * fakes sit mid-paragraph, so they are folded back into the previous entry.
 */
const mergeContinuations = (entries, allNames, lines)=>{
	const merged = [];

	entries.forEach((entry)=>{
		const previous = merged[merged.length - 1];
		const name = flatten(entry.name);

		if(previous && /:$/.test(previous.desc.trim()) && !lines.some((line)=>flatten(line).startsWith(`${name}. `))){
			const rest = completeFromText(previous, allNames.filter((other)=>other !== name), lines);
			if(rest && flatten(rest).startsWith(`${name}. `)){
				previous.desc = `${previous.desc} ${rest}`;
				return;
			}
		}

		merged.push(entry);
	});

	return merged;
};

/**
 * Remove PDF debris the gist left in entries, using the stat block text as the source of truth.
 */
export const cleanEntries = (result, monsterText, textData, blockTitles)=>{
	const lines = [monsterText.position - 1, monsterText.position, monsterText.position + 1].flatMap((position)=>textData[position]?.lines ?? []);

	ENTRY_SECTIONS.filter((key)=>result[key]).forEach((key)=>{
		result[key] = result[key]
			.filter((entry)=>!SPELL_LIST_ENTRY_NAME.test(entry.name))
			.map((entry)=>({ ...entry, desc: stripTrailingTitle(entry.desc, blockTitles) }))
			.flatMap((entry)=>splitMergedEntry(entry, lines));
	});

	const allEntries = ENTRY_SECTIONS.flatMap((key)=>result[key] || []);

	ENTRY_SECTIONS.filter((key)=>result[key]).forEach((key)=>{
		result[key].filter((entry)=>!/[.):]$/.test(entry.desc.trim())).forEach((entry)=>{
			const otherNames = allEntries.filter((other)=>other !== entry).map((other)=>flatten(other.name));
			const rest = completeFromText(entry, otherNames, lines);
			if(rest){ entry.desc = `${entry.desc} ${rest}`; }
		});

		result[key] = result[key].filter((entry, index, entries)=>
			!(index > 0 && flatten(entries[index - 1].desc).includes(`${flatten(entry.name)}. ${flatten(entry.desc).slice(0, 15)}`))
		);

		result[key] = mergeContinuations(result[key], allEntries.map((entry)=>flatten(entry.name)), lines);
	});
};
