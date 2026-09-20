import fs from 'fs'

const LABEL = /^(Skills|Gear|Resistances|Immunities|Vulnerabilities|Senses|Languages|CR) /;
const MID_LINE_LABEL = /(?<=\S) ?(?=(?:Skills|Gear|Resistances|Immunities|Vulnerabilities|Senses|Languages) [A-Z]|CR \d)/g;

/**
 * The PDF extraction splits ability scores from their labels, wraps long header fields
 * onto extra lines, and runs others together. The header runs from the first labelled
 * line to the CR line.
 */
const normalizeText = (rawText)=>{
	const text = rawText.replace(/^(Str|Dex|Con|Int|Wis|Cha) *\n? *(\d+)$/gim, (_, stat, score)=>`${stat[0].toUpperCase()}${stat.slice(1).toLowerCase()} ${score}`);
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
		xp: Number((( data.match(/^CR \S+ \((?:XP )?([\d,]+)/m) || [])[1] || '').replace(/,/g, '')),
		xp_in_lair: Number((( data.match(/^CR \S+ \(XP [\d,]+, or ([\d,]+) in lair/m) || [])[1] || '').replace(/,/g, '')) || undefined,
		proficiency_bonus: Number (( data.match(/( PB \+\d\))/g) || [' PB +0'] )[0].slice(5,6))
	};
});


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
	result.skills = monsterText.skills;
	result.gear = monsterText.gear;
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
		});
	});

	['armor_desc', 'initiative', 'perception', 'old_senses'].forEach((key)=>{ delete result[key]; });

	return result;
})

fs.writeFileSync(process.argv[2] ?? './5e-SRD-Monsters-New.json', JSON.stringify(monstersNew, null, 2));

console.log('Monster data entries:', monstersNew.length);
