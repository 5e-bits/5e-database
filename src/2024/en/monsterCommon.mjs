export const ENTRY_SECTIONS = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'];

export const SECTION_HEADING = /^(Traits|Actions|Bonus Actions|Reactions|Legendary Actions)\s*$/;

export const abilityRef = (name)=>{
	const index = name.slice(0, 3).toLowerCase();
	return { index, name: index.toUpperCase(), url: `/api/2024/ability-scores/${index}` };
};

/**
 * Compare gist and stat block text: they differ in quotes, dashes, spacing and hyphenation.
 */
export const flatten = (text)=>text.replace(/’/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').replace(/([a-z])- ([a-z])/g, '$1$2').trim();
