import fs from 'fs'

const LABEL = /^(Skills|Gear|Resistances|Immunities|Vulnerabilities|Senses|Languages|CR) /;
const MID_LINE_LABEL = /(?<=\S) ?(?=(?:Skills|Gear|Resistances|Immunities|Vulnerabilities|Senses|Languages) [A-Z]|CR \d)/g;

/**
 * The PDF extraction splits ability scores from their labels, wraps long header fields
 * onto extra lines, and runs others together. The header runs from the first labelled
 * line to the CR line.
 */
const normalizeText = (rawText)=>{
	const text = rawText.replace(/(\S) (At Will|\d+\/Day(?: Each)?): /g, '$1\n$2: ').replace(/^(Str|Dex|Con|Int|Wis|Cha) *\n? *(\d+)$/gim, (_, stat, score)=>`${stat[0].toUpperCase()}${stat.slice(1).toLowerCase()} ${score}`);
	const out = [];
	let inHeader = false;

	text.split('\n').forEach((line)=>{
		if(!inHeader && !LABEL.test(line)){ out.push(line); return; }

		inHeader = true;
		line.split(MID_LINE_LABEL).forEach((piece)=>{
			if(LABEL.test(piece)){ out.push(piece); }
			else if(piece.trim()){ out[out.length - 1] += ` ${piece.trim()}`; }
			if(/^CR /.test(piece)){ inHeader = false; }
		});
	});

	return out.join('\n');
};

const DAMAGE = /\d+ \((\d+d\d+(?: [+\u2212\u2013-] \d+)?)\) (\w+) damage/g;

/**
 * The gist keeps only the first damage roll, so read every damage type from the description.
 */
const parseDamage = (desc)=>[...desc.matchAll(DAMAGE)].map(([, dice, type])=>({
	damage_type: { index: type.toLowerCase(), name: type, url: `/api/2024/damage-types/${type.toLowerCase()}` },
	damage_dice: dice.replace(/ /g, '').replace(/[\u2212\u2013]/g, '-')
}));

const SAVE_DC = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+)/;
const ESCAPE_DC = /escape DC (\d+)/;
const CHECK_DC = /DC (\d+) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) \(/;
const VARIABLE_SAVE_DC = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw \(DC \d+ plus/;

const abilityRef = (name)=>{
	const index = name.slice(0, 3).toLowerCase();
	return { index, name: index.toUpperCase(), url: `/api/2024/ability-scores/${index}` };
};

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

const SPELL_USAGE = /^(At Will|(\d+)\/Day(?: Each)?):\s*(.*)$/;
const SECTION_HEADING = /^(Traits|Actions|Bonus Actions|Reactions|Legendary Actions)\s*$/;
const ENTRY_START = /^[^:]*?\. [A-Z]/;

const spells = JSON.parse(fs.readFileSync('./5e-SRD-Spells.json', 'utf-8'));
const spellsByName = new Map(spells.map((spell)=>[spell.name.toLowerCase(), spell]));

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
	const spell = spellsByName.get(name.toLowerCase().replace(/’/g, "'"));
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
const parseSpellLists = (data)=>{
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

const SINGLE_CAST_INTRO = /^(?:While within 30 feet of at least two hag allies, the hag can cast |(?:While [^,]+, )?[Tt]he [\w ]+ casts? )/;
const CAST_NAMES = /casts (?:the )?(.+?)(?: spell)?( on itself| twice)?,? (?:requiring|using|in response)/;
const COVEN_NAMES = /following spells,.*?: (.+?)\. /;
const REPLACEMENT_NAMES = /replace one (\w+) with (.+?)\./;
const NAME_SEPARATOR = /,\s*(?:or |and )?|\s+or\s+/;

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

const normalizedText = normalizeText(fs.readFileSync('./monster-text-data.txt', 'utf-8'));
fs.writeFileSync(process.argv[3] ?? './monster-text-data.normalized.txt', normalizedText);

const textSource = normalizedText.split(/\nMOD/);

textSource.splice(0, 1);

console.log('Text data array length:', textSource.length);

const textData = [];

textSource.forEach((data, index)=>{
	textData[index] =  {
		fingerprint: [
			...['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'].map((stat)=>( data.match(new RegExp(`^${stat} (\\d+)`, 'm')) || [])[1]),
			( data.match(/^CR (\S+) /m) || [])[1]
		].join('|'),
		skills: ( data.match(/^(Skills .*)$/gm) || ['Skills None'] )[0].slice(7),
		gear: ( data.match(/^(Gear .*)$/gm) || ['Gear None'] )[0].slice(5),
		passive_perception: Number(( data.match(/^Senses .*Passive Perception (\d+)/m) || [])[1]),
		position: index,
		lines: data.split('\n'),
		spellLists: parseSpellLists(data),
		xp: Number((( data.match(/^CR \S+ \((?:XP )?([\d,]+)/m) || [])[1] || '').replace(/,/g, '')),
		xp_in_lair: Number((( data.match(/^CR \S+ \(XP [\d,]+, or ([\d,]+) in lair/m) || [])[1] || '').replace(/,/g, '')) || undefined,
		proficiency_bonus: Number (( data.match(/( PB \+\d\))/g) || [' PB +0'] )[0].slice(5,6))
	};
});


const ENTRY_SECTIONS = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'];
const SPELL_LIST_ENTRY_NAME = /^(At Will|\d+\/Day(?: Each)?)$/;
const USAGE_HEADING = /^([A-Z][^.]{2,60}\((?:\d+\/Day[^)]*|Recharge[^)]*)\))\. /;

const normalizedLines = normalizedText.split('\n');
const blockTitles = normalizedLines
	.filter((line, index)=>/^[A-Z][A-Za-z’' -]+$/.test(line) && normalizedLines.slice(index + 1, index + 9).some((next)=>/^AC \d/.test(next)))
	.map((line)=>line.trim())
	.sort((a, b)=>b.length - a.length);

const flatten = (text)=>text.replace(/’/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').replace(/([a-z])- ([a-z])/g, '$1$2').trim();

/**
 * The gist runs the next stat block's title onto the last entry of a block.
 */
const stripTrailingTitle = (desc)=>{
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
	const heading = entry.desc.match(/\. ([A-Z][^.]{2,60}\((?:\d+\/Day[^)]*|Recharge[^)]*)\))\. /);
	if(!heading || !lines.some((line)=>flatten(line).startsWith(`${flatten(heading[1])}. `))){ return [entry]; }

	const at = entry.desc.indexOf(`${heading[1]}. `);
	return [
		{ ...entry, desc: entry.desc.slice(0, at).trim() },
		{ name: heading[1], desc: entry.desc.slice(at + heading[1].length + 2).trim() }
	];
};

const cleanEntries = (result, monsterText)=>{
	const lines = [monsterText.position - 1, monsterText.position, monsterText.position + 1].flatMap((position)=>textData[position]?.lines ?? []);

	ENTRY_SECTIONS.filter((key)=>result[key]).forEach((key)=>{
		result[key] = result[key]
			.filter((entry)=>!SPELL_LIST_ENTRY_NAME.test(entry.name))
			.map((entry)=>({ ...entry, desc: stripTrailingTitle(entry.desc) }))
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
	});
};

const monsters = JSON.parse(fs.readFileSync('./monsters.json', 'utf-8'));

const monstersOld = JSON.parse(fs.readFileSync('../../2014/en/5e-SRD-Monsters.json', 'utf-8'));

/**
 * Text blocks are not reliably in the same order as the gist, and grouped stat blocks
 * have no per-monster name, so pair them on ability scores plus CR instead.
 */
const claimed = new Set();
const findTextData = (monster)=>{
	const fingerprint = [...['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((stat)=>monster[stat]), monster.challenge_rating].join('|');
	const match = textData.findIndex((data, index)=>!claimed.has(index) && data.fingerprint === fingerprint);
	if(match < 0){ throw new Error(`No text data for ${monster.slug} (${fingerprint})`); }
	claimed.add(match);
	return textData[match];
};

const monstersNew = Object.keys(monsters).filter((monster)=>{return monster != '_info'}).map((monster)=>{
	const result = { ...monsters[monster] };

	result.index = result.slug;
	result.url = `/api/2024/monsters/${result.slug}`;
	result.image = monstersOld.filter((monster)=>{ return monster.index == result.slug; })[0]?.image || `/api/images/monsters/${result.slug}-NYI.png`;
	delete result.slug;

	delete result.document_slug;
	delete result.group;

	result.hit_points_roll = result.hit_dice.replace('−', '-');
	result.hit_dice = result.hit_dice.split(' ')[0];

	Object.keys(result.speed).forEach((type)=>{
		result.speed[type] = type != 'hover' ? `${result.speed[type]} ft.` : true;
	})

	const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

	result.proficiencies = [];

	stats.forEach((stat)=>{
		const stat_mod = Math.floor((result[stat] - 10) / 2);
		if(result[`${stat}_save`] != stat_mod){
			result.proficiencies.push(
				{
					"value": result[`${stat}_save`],
					"proficiency": {
						"index": `saving-throw-${stat.slice(0, 3)}`,
						"name": `Saving Throw: ${stat.slice(0, 3).toUpperCase()}`,
						"url": `/api/2024/proficiencies/saving-throw-${stat.slice(0, 3)}`
					}
				}
			);
		}
		delete result[`${stat}_save`];
	});

	result.old_senses = result.senses;
	result.senses = {};

	const senseLabels = { darkvision: 'Darkvision', blindsight: 'Blindsight', tremorsense: 'Tremorsense', truesight: 'Truesight' };

	Object.entries(senseLabels).forEach(([key, label])=>{
		const match = result.old_senses.match(new RegExp(`${label} (\\d+ ft\\.(?: \\([^)]*\\))?)`));
		if(match){ result.senses[key] = match[1]; }
	});

	const lowerCaseArrays = [ 'damage_resistances', 'damage_vulnerabilities', 'damage_immunities', 'condition_immunities'];

	lowerCaseArrays.forEach((array_name)=>{
		result[array_name] = result[array_name].map((value)=>{ return value.toLowerCase(); });
	});

	const monsterText = findTextData(monsters[monster]);
	cleanEntries(result, monsterText);
	['skills', 'gear'].forEach((key)=>{
		if(monsterText[key] !== 'None'){ result[key] = monsterText[key]; }
	});
	result.proficiency_bonus = monsterText.proficiency_bonus;
	result.senses.passive_perception = monsterText.passive_perception;
	result.xp = monsterText.xp;
	if(monsterText.xp_in_lair){ result.xp_in_lair = monsterText.xp_in_lair; }

	const [numerator, denominator = 1] = result.challenge_rating.split('/').map(Number);
	result.challenge_rating = numerator / denominator;

	/**
	 * The gist has no armor type, so this is a guess: creatures with gear wear armor.
	 */
	result.armor_class = [{ type: monsterText.gear === 'None' ? 'natural' : 'armor', value: result.armor_class }];

	result.condition_immunities = result.condition_immunities.map((condition)=>{
		const index = condition.replace(/ \(.*\)$/, '');
		return { index, name: `${index[0].toUpperCase()}${index.slice(1)}`, url: `/api/2024/conditions/${index}` };
	});

	['reactions', 'bonus_actions'].forEach((key)=>{
		if(!result[key].length){ delete result[key]; }
	});
	['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'].forEach((key)=>{
		(result[key] || []).forEach((entry)=>{
			delete entry.damage_dice;
			delete entry.damage_bonus;

			const damage = parseDamage(entry.desc);
			if(damage.length){ entry.damage = damage; }

			const dc = parseDc(entry.desc);
			if(dc){ entry.dc = dc; }

			if(/casts one of the following spells.*as (?:the )?spellcasting ability/.test(entry.desc)){
				const key = spellcastingKey(entry.desc);
				const nearby = [textData[monsterText.position - 1], monsterText, textData[monsterText.position + 1]].flatMap((data)=>data?.spellLists ?? []);
				const spellList = nearby.find((list)=>!list.used && list.key === key);
				if(!spellList){ throw new Error(`No spell list for ${result.index} ${entry.name} (${key})`); }
				spellList.used = true;
				entry.spellcasting = buildSpellcasting(entry.desc, spellList.spells);
			}
		});
	});

	const main = ['special_abilities', 'actions'].flatMap((key)=>result[key] || []).find((entry)=>entry.spellcasting)?.spellcasting;

	['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'].forEach((key)=>{
		(result[key] || []).forEach((entry)=>{
			if(entry.spellcasting || !/spellcasting ability/.test(entry.desc) || !SINGLE_CAST_INTRO.test(entry.desc)){ return; }
			entry.spellcasting = buildSpellcasting(entry.desc, parseSingleCast(entry), main);
		});
	});


	['armor_desc', 'initiative', 'perception', 'old_senses'].forEach((key)=>{ delete result[key]; });

	return result;
})

const unusedLists = textData.flatMap((data)=>data.spellLists).filter((list)=>!list.used);
if(unusedLists.length){
	throw new Error(`Unused spell lists: ${JSON.stringify(unusedLists.map((list)=>[list.key, list.spells[0].name]))}`);
}

fs.writeFileSync(process.argv[2] ?? './5e-SRD-Monsters-New.json', JSON.stringify(monstersNew, null, 2));

console.log('Monster data entries:', monstersNew.length);
