import fs from 'fs';
import { armorFromGear } from './monsterArmor.mjs';
import { ENTRY_SECTIONS } from './monsterCommon.mjs';
import { cleanEntries, addDamageAndDc } from './monsterEntries.mjs';
import { splitForms } from './monsterForms.mjs';
import { addMultiattack } from './monsterMultiattack.mjs';
import { skillProficienciesFrom } from './monsterSkills.mjs';
import { addSpellcasting, assertAllSpellListsUsed } from './monsterSpellcasting.mjs';
import { createTextFinder, findBlockTitles, findSpeedLine, normalizeText, parseTextBlocks } from './monsterText.mjs';
import { addUsage } from './monsterUsage.mjs';

const normalizedText = normalizeText(fs.readFileSync('./monster-text-data.txt', 'utf-8'));
fs.writeFileSync(process.argv[3] ?? './monster-text-data.normalized.txt', normalizedText);

const textData = parseTextBlocks(normalizedText);
const blockTitles = findBlockTitles(normalizedText);
const findTextData = createTextFinder(textData);

const monsters = JSON.parse(fs.readFileSync('./monsters.json', 'utf-8'));

const monstersOld = JSON.parse(fs.readFileSync('../../2014/en/5e-SRD-Monsters.json', 'utf-8'));

const imageFor = (index)=>monstersOld.find((monster)=>monster.index === index)?.image || `/api/images/monsters/${index}-NYI.png`;

const unparsedMultiattack = [];

const monstersNew = Object.keys(monsters).filter((monster)=>{return monster != '_info'}).flatMap((monster)=>{
	const result = { ...monsters[monster] };

	result.index = result.slug;
	result.url = `/api/2024/monsters/${result.slug}`;
	result.image = imageFor(result.slug);
	delete result.slug;

	delete result.document_slug;
	delete result.group;

	/**
	 * The gist splits "Medium or Small Humanoid" at the wrong point for most monsters with a
	 * size-variable type, leaving `type` holding "or small humanoid" instead of `size`.
	 */
	const sizeType = result.type.match(/^or (\w+) (.+)$/);
	if(sizeType){
		result.size = `${result.size} or ${sizeType[1]}`;
		result.type = sizeType[2];
	}

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
	cleanEntries(result, monsterText, textData, blockTitles);
	if(monsterText.gear !== 'None'){ result.gear = monsterText.gear; }
	result.proficiencies.push(...skillProficienciesFrom(monsterText.skills));
	result.proficiency_bonus = monsterText.proficiency_bonus;
	result.senses.passive_perception = monsterText.passive_perception;
	if(monsterText.languages){ result.languages = monsterText.languages; }
	result.xp = monsterText.xp;
	if(monsterText.xp_in_lair){ result.xp_in_lair = monsterText.xp_in_lair; }

	const [numerator, denominator = 1] = result.challenge_rating.split('/').map(Number);
	result.challenge_rating = numerator / denominator;

	const armor = armorFromGear(monsterText.gear);
	result.armor_class = [{ value: result.armor_class, ...(armor.length && { armor }) }];

	result.condition_immunities = result.condition_immunities.map((condition)=>{
		const index = condition.replace(/ \(.*\)$/, '');
		return { index, name: `${index[0].toUpperCase()}${index.slice(1)}`, url: `/api/2024/conditions/${index}` };
	});

	['reactions', 'bonus_actions'].forEach((key)=>{
		if(!result[key].length){ delete result[key]; }
	});
	addDamageAndDc(result);
	addUsage(result, ENTRY_SECTIONS);
	addSpellcasting(result, monsterText, textData);
	unparsedMultiattack.push(...addMultiattack(result));

	['armor_desc', 'initiative', 'perception', 'old_senses'].forEach((key)=>{ delete result[key]; });

	return splitForms(result, imageFor, ()=>findSpeedLine(normalizedText, result, /Lycanthrope/));
})

assertAllSpellListsUsed(textData);

console.log('Multiattack entries without structure:', unparsedMultiattack.length);

fs.writeFileSync(process.argv[2] ?? './5e-SRD-Monsters-New.json', JSON.stringify(monstersNew, null, 2));

console.log('Monster data entries:', monstersNew.length);
