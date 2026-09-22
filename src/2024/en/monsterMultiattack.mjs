import { findSpell } from './monsterSpellcasting.mjs';

const NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const NAME = "[A-Z][\\w’' -]*?";
const NAME_SEPARATOR = /,\s*(?:or |and )?|\s+(?:or|and)\s+/;

const number = (word)=>NUMBERS[word.toLowerCase()];

/**
 * Attack type comes from the monster's own entry. Anything that is not an attack roll is
 * `special`, matching the existing 2024 monsters.
 */
const attackType = (name, result)=>{
	const entry = ['actions', 'bonus_actions']
		.flatMap((key)=>result[key] || [])
		.find((candidate)=>candidate.name.replace(/\s*\(.*\)$/, '').toLowerCase() === name.toLowerCase());
	if(!entry){ return undefined; }
	return /^(Melee|Ranged) /.test(entry.desc) ? entry.desc.match(/^(Melee|Ranged)/)[1].toLowerCase() : 'special';
};

const action = (name, count, result)=>{
	const type = attackType(name, result);
	if(!type){ throw new Error(`Unknown action ${name}`); }
	return { action_name: name, count, type };
};

const castAction = (name)=>{
	const spell = findSpell(name);
	if(!spell){ throw new Error(`Unknown spell ${name}`); }
	return { action_name: spell.name, count: 1, type: spell.attack_type ?? 'special' };
};

const optionOf = (item)=>({ option_type: 'action', ...item });

const choice = (options, choose = 1, desc)=>({
	...(desc && { desc }),
	choose,
	type: 'action',
	from: { option_set_type: 'options_array', options }
});

const multipleOrSingle = (items)=>items.length === 1 ? optionOf(items[0]) : { option_type: 'multiple', items: items.map(optionOf) };

/**
 * Parse one clause after "makes": fixed attacks and ability uses, plus at most one choice.
 */
const parseClause = (body, result)=>{
	const parsed = { fixed: [], choice: null };

	const any = body.match(/^(?:(.+?) and )?(\w+) (?:other )?attacks, using (.+) in any combination$/);
	if(any){
		if(any[1]){ parsed.fixed = parseTerms(any[1], result); }
		const picks = number(any[2]);
		const options = any[3].split(NAME_SEPARATOR).map((name)=>optionOf(action(name, picks, result)));
		parsed.choice = choice(options, picks, 'Any combination');
		return parsed;
	}

	const heads = body.match(new RegExp(`^as many (${NAME}) attacks as it has heads$`));
	if(heads){
		parsed.fixed = [action(heads[1], 'Number of Heads', result)];
		return parsed;
	}

	const [attacks, abilities] = body.split(/,? and (?:it )?(?:can use|uses) /);

	const eitherOr = attacks.match(new RegExp(`^(\\w+) (${NAME}) or (${NAME}) attacks?$`));
	if(eitherOr){
		const picks = number(eitherOr[1]);
		parsed.choice = choice([eitherOr[2], eitherOr[3]].map((name)=>optionOf(action(name, picks, result))), picks);
	}
	else{
		parsed.fixed = parseTerms(attacks, result);
	}

	if(abilities){
		const cast = abilities.match(new RegExp(`^Spellcasting to cast (${NAME})$`));
		const names = abilities.replace(/ if available$/, '').replace(/^either /, '').split(NAME_SEPARATOR);
		if(cast && parsed.choice){ parsed.choice.from.options.push(optionOf({ ...castAction(cast[1]), count: parsed.choice.choose })); }
		else if(names.length === 1){ parsed.fixed.push(parseUse(names[0], result)); }
		else if(parsed.choice){ throw new Error('Two choices'); }
		else{ parsed.choice = choice(names.map((name)=>optionOf(action(name, 1, result)))); }
	}

	return parsed;
};

const parseUse = (text, result)=>{
	const use = text.match(new RegExp(`^(${NAME})( twice)?$`));
	return action(use[1], use[2] ? 2 : 1, result);
};

const parseTerms = (text, result)=>text.split(/,\s*(?:and )?| and /).map((term)=>{
	const attack = term.match(new RegExp(`^(?:makes )?(\\w+) (${NAME}) attacks?$`));
	if(attack && number(attack[1]) !== undefined){ return action(attack[2], number(attack[1]), result); }

	const use = term.match(/^(?:uses|can use) (.+)$/);
	if(use){ return parseUse(use[1], result); }

	throw new Error(`Cannot read term '${term}'`);
});

const REPLACEMENT = /^It can replace (one|two|any|the (.+?)) attacks? with (?:a use of |an? )?(.+?)(?: if available)?\.?$/;

const replacementCandidates = (text, result)=>text.split(/^\(A\) | or \(B\) /).filter(Boolean).map((candidate)=>{
	const cast = candidate.match(new RegExp(`^Spellcasting to cast (${NAME})(?: \\(level \\d version\\))?$`));
	if(cast){ return castAction(cast[1]); }
	return action(candidate.replace(/ attack$/, '').replace(/\s*\(level \d version\)$/, ''), 1, result);
});

/**
 * "It can replace one attack with X" after a fixed attack: keep the remaining attacks fixed
 * and offer the replacement as a choice against the original attack, like the existing 2024
 * monsters. "Any attack" means any mix of the attack and the replacement.
 */
const applyReplacement = (fixed, sentence, result)=>{
	const match = sentence.match(REPLACEMENT);
	if(!match){ throw new Error('Cannot read replacement'); }

	const candidates = replacementCandidates(match[3], result);

	if(match[1] === 'any'){
		if(fixed.length !== 1){ throw new Error('Ambiguous replacement'); }
		const picks = fixed[0].count;
		return { fixed: [], options: choice([fixed[0], ...candidates].map((item)=>optionOf({ ...item, count: picks })), picks, 'Any combination') };
	}

	const replaced = match[2] ? fixed.find((item)=>item.action_name === match[2]) : fixed[fixed.length - 1];
	if(!replaced || (!match[2] && fixed.length !== 1)){ throw new Error('Ambiguous replacement'); }

	const removed = match[2] ? 1 : number(match[1]);
	const remaining = fixed.map((item)=>item === replaced ? { ...item, count: item.count - removed } : item).filter((item)=>item.count > 0);

	return { fixed: remaining, options: choice([{ ...replaced, count: removed }, ...candidates].map(optionOf)) };
};

/**
 * "It can replace one attack with X" after a choice: X joins the choice, and its count is
 * how many of the attacks it can take the place of.
 */
const addReplacementToChoice = (pick, sentence, result)=>{
	const match = sentence.match(REPLACEMENT);
	if(!match || match[2]){ throw new Error('Cannot read replacement'); }

	const uses = match[1] === 'any' ? pick.choose : number(match[1]);
	pick.from.options.push(...replacementCandidates(match[3], result).map((item)=>optionOf({ ...item, count: uses })));
};

const build = (entry, result)=>{
	const [mainSentence, ...rest] = entry.desc.split(/(?<=\.)\s+(?=[A-Z])/);
	const main = mainSentence.match(/^(?:The|It) [\w' -]+? (?:makes|can make) (.+)\.$/);
	if(!main || rest.length > 1 || (rest[0] && !rest[0].startsWith('It can replace'))){ throw new Error('Unrecognized shape'); }

	const bodies = main[1].replace(/ if it used .+ this turn$/, '').split(/, or it makes | or (?:it )?uses /);
	const clauses = bodies.map((body, index)=>parseClause(index > 0 && /^\S+ [A-Z]/.test(body) && !/attacks?$/.test(body) ? `uses ${body}` : body, result));

	if(clauses.length === 2){
		if(rest.length || clauses.some((clause)=>clause.choice)){ throw new Error('Unsupported alternatives'); }
		const options = clauses.map((clause)=>multipleOrSingle(clause.fixed));
		return { multiattack_type: 'action_options', action_options: choice(options, 1, /if it used/.test(main[1]) ? main[1] : undefined) };
	}

	const [{ fixed, choice: pick }] = clauses;

	if(rest.length && pick){
		addReplacementToChoice(pick, rest[0], result);
		return { multiattack_type: fixed.length ? 'actions' : 'action_options', ...(fixed.length && { actions: fixed }), action_options: pick };
	}

	if(rest.length){
		const replaced = applyReplacement(fixed, rest[0], result);
		return { multiattack_type: replaced.fixed.length ? 'actions' : 'action_options', ...(replaced.fixed.length && { actions: replaced.fixed }), action_options: replaced.options };
	}

	return {
		multiattack_type: fixed.length ? 'actions' : 'action_options',
		...(fixed.length && { actions: fixed }),
		...(pick && { action_options: pick })
	};
};

/**
 * Add structured multiattack data. Entries that do not fit a known shape keep only their
 * description, and their names are returned so nothing is guessed.
 */
export const addMultiattack = (result)=>{
	const unparsed = [];

	(result.actions || []).filter((entry)=>/^Multiattack/.test(entry.name)).forEach((entry)=>{
		try{
			Object.assign(entry, build(entry, result));
		}catch(error){
			unparsed.push(`${result.index}: ${error.message}`);
		}
	});

	return unparsed;
};
