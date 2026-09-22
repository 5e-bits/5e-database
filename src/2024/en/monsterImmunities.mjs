import fs from 'fs';

const damageTypes = JSON.parse(fs.readFileSync(new URL('./5e-SRD-Damage-Types.json', import.meta.url), 'utf-8'));
const conditions = JSON.parse(fs.readFileSync(new URL('./5e-SRD-Conditions.json', import.meta.url), 'utf-8'));

const damageTypeNames = new Set(damageTypes.map((type)=>type.name.toLowerCase()));
const conditionNames = new Set(conditions.map((condition)=>condition.name.toLowerCase()));

const bareWord = (word)=>word.replace(/\s*\(.*\)$/, '').toLowerCase();

const classify = (word)=>{
	const bare = bareWord(word);
	if(damageTypeNames.has(bare)){ return 'damage'; }
	if(conditionNames.has(bare)){ return 'condition'; }
	throw new Error(`Unknown immunity '${word}'`);
};

const splitList = (text)=>text ? text.split(', ').map((word)=>word.trim()) : [];

/**
 * The gist's own damage_resistances/damage_vulnerabilities/damage_immunities/
 * condition_immunities can be truncated or, for immunities, mis-split entirely (a
 * conditions-only "Immunities" line with no semicolon lands whole in damage_immunities),
 * so read all four straight from the stat block text instead.
 */
export const parseDamageList = (text)=>splitList(text).map((word)=>word.toLowerCase());

/**
 * "Immunities" lists damage types, then conditions after a semicolon; a stat block with only
 * one kind has no semicolon, so the single list must be classified word by word instead.
 */
export const parseImmunities = (text)=>{
	const [before, after] = (text ?? '').split('; ');
	if(after !== undefined){
		return { damage: splitList(before).map((word)=>word.toLowerCase()), conditions: splitList(after) };
	}

	const words = splitList(before);
	if(!words.length){ return { damage: [], conditions: [] }; }

	const kind = classify(words[0]);
	if(!words.every((word)=>classify(word) === kind)){ throw new Error(`Mixed immunities: '${text}'`); }
	return kind === 'damage' ? { damage: words.map((word)=>word.toLowerCase()), conditions: [] } : { damage: [], conditions: words };
};
