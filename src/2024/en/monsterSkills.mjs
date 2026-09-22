import fs from 'fs';

const proficiencies = JSON.parse(fs.readFileSync(new URL('./5e-SRD-Proficiencies.json', import.meta.url), 'utf-8'));
const skillsByName = new Map(proficiencies.filter((entry)=>entry.type === 'Skills').map((entry)=>[entry.name.replace('Skill: ', '').toLowerCase(), entry]));

/**
 * 2014 monsters have no separate skills field; a skill is just another entry in
 * `proficiencies`, alongside saving throws. Mirror that instead of keeping a free-text
 * "History +12, Perception +10" string no other monster in either edition carries.
 */
export const skillProficienciesFrom = (skillsText)=>{
	if(skillsText === 'None'){ return []; }

	return skillsText.split(', ').map((entry)=>{
		const match = entry.match(/^(.+) \+(\d+)$/);
		const skill = match && skillsByName.get(match[1].toLowerCase());
		if(!skill){ throw new Error(`Unknown skill '${entry}'`); }

		const { index, name, url } = skill;
		return { value: Number(match[2]), proficiency: { index, name, url } };
	});
};
