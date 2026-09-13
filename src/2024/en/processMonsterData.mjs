import fs from 'fs'
import { resourceLimits } from 'worker_threads';

const monsters = JSON.parse(fs.readFileSync('./monsters.json', 'utf-8'));

const monstersOld = JSON.parse(fs.readFileSync('../../2014/en/5e-SRD-Monsters.json', 'utf-8'));

const monstersNew = Object.keys(monsters).filter((monster)=>{return monster != '_info'}).map((monster)=>{
	const result = { ...monsters[monster] };

	result.index = result.slug;
	result.url = `/api/2024/monsters/${result.slug}`;
	result.image = monstersOld.filter((monster)=>{ return monster.index == result.slug; })[0]?.image || `/api/images/monsters/${result.slug}-NYI.png`;
	delete result.slug;

	delete result.document_slug;
	delete result.group;

	result.hit_points_roll = result.hit_dice;
	result.hit_dice = result.hit_dice.split(' ')[0];

	Object.keys(result.speed).forEach((type)=>{
		result.speed[type] = type != 'hover' ? `${result.speed[type]} ft.` : true;
	})

	const stats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

	result.proficiencies = [];

	stats.forEach((stat)=>{
		const stat_mod = Math.floor((result[stat] - 10) / 2);
		if(result[`${stat}_save`] != stat_mod){
			result.proficiency_bonus = result[`${stat}_save`] - stat_mod;
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
		if(!result.proficiency_bonus) result.proficiency_bonus = 0;
		delete result[`${stat}_save`];
	});

	const senses = result.senses.split(';');
	
	const senseMap = {
		'darkvision': {
			"name": "Darkvision",
			"value": (s)=>{ return s.slice(11); }
		},
		'blindsight': {
			"name": "Blindsight",
			"value": (s)=>{ return s.slice(11); }
		},
		'tremorsense': {
			"name": "Tremorsense",
			"value": (s)=>{ return s.slice(13); }
		},
		'truesight': {
			"name": "Truesight",
			"value": (s)=>{ return s.slice(10); }
		},
		'passive_perception': {
			"name": "Passive Perception",
			"value": (s)=>{ return Number(s.slice(19)); }
		}
	};

	result.old_senses = result.senses;
	result.senses = {};
	
	senses.forEach((sense)=>{
		Object.keys(senseMap).forEach((sense_name)=>{
			if(sense.trim().startsWith(senseMap[sense_name].name)){ result.senses[sense_name] = senseMap[sense_name].value(sense); };
		});
	});

	const lowerCaseArrays = [ 'damage_resistances', 'damage_vulnerabilities', 'damage_immunities', 'condition_immunities'];

	lowerCaseArrays.forEach((array_name)=>{
		result[array_name] = result[array_name].map((value)=>{ return value.toLowerCase(); });
	});

	return result;
})

fs.writeFileSync('./5e-SRD-Monsters-New.json', JSON.stringify(monstersNew, null, 2));

console.log('Monster data entries:', monstersNew.length);
