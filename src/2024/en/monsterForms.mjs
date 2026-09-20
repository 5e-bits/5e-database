const FORM_SETS = {
	werebear: [['human', 'Human'], ['hybrid', 'Hybrid'], ['bear', 'Bear']],
	wereboar: [['human', 'Human'], ['hybrid', 'Hybrid'], ['boar', 'Boar']],
	wererat: [['human', 'Human'], ['hybrid', 'Hybrid'], ['rat', 'Rat']],
	weretiger: [['human', 'Human'], ['hybrid', 'Hybrid'], ['tiger', 'Tiger']],
	werewolf: [['human', 'Human'], ['hybrid', 'Hybrid'], ['wolf', 'Wolf']],
	vampire: [['vampire', 'Vampire'], ['bat', 'Bat'], ['mist', 'Mist']]
};

const FORM_TAG = /\s*\(([^)]*) Form Only\)$/;
const SECTIONS = ['special_abilities', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'];

const tagKey = (label)=>label === 'Humanoid' ? 'human' : label.toLowerCase();

/**
 * Form-restricted entries are named like "Bite (Rat or Hybrid Form Only)".
 */
const formsOf = (entry)=>entry.name.match(FORM_TAG)?.[1].split(' or ').map(tagKey);

const formSizes = (base)=>{
	const shift = base.bonus_actions.find((entry)=>entry.name === 'Shape-Shift')?.desc ?? '';

	const vampire = shift.match(/into an? (\w+) bat \(Speed (\d+) ft\., Fly Speed (\d+) ft\.\) or an? (\w+) cloud of mist \(Speed (\d+) ft\., Fly Speed (\d+) ft\. \[hover\]\)/);
	if(vampire){
		return {
			bat: { size: vampire[1], speed: { walk: `${vampire[2]} ft.`, fly: `${vampire[3]} ft.` } },
			mist: { size: vampire[4], speed: { walk: `${vampire[5]} ft.`, fly: `${vampire[6]} ft.`, hover: true } }
		};
	}

	const lycanthrope = shift.match(/into an? (\w+) [\w-]+ hybrid(?: form)? or an? (\w+) /);
	if(!lycanthrope){ throw new Error(`Cannot read forms of ${base.index}`); }
	return { hybrid: { size: lycanthrope[1] }, animal: { size: lycanthrope[2] } };
};

/**
 * "Speed 30 ft., 40 ft. (wolf form only)": untagged speeds apply to every form, and tagged
 * speeds replace them in that form.
 */
const lycanthropeSpeed = (speedLine, animalKey, isAnimal)=>{
	const speed = {};

	speedLine.split(', ').forEach((token)=>{
		const match = token.match(/^(?:(\w+) )?(\d+ ft\.)(?: \((\w+) form only\))?$/);
		if(!match){ throw new Error(`Cannot read speed '${token}'`); }
		if(match[3] && !(isAnimal && match[3] === animalKey)){ return; }
		speed[match[1]?.toLowerCase() ?? 'walk'] = match[2];
	});

	return speed;
};

const keepsAction = (names)=>(item)=>names.has(item.action_name);

/**
 * Drop multiattack options that name actions this form does not have.
 */
const pruneMultiattack = (entry, names)=>{
	const keep = keepsAction(names);

	if(entry.actions){
		entry.actions = entry.actions.filter(keep);
		if(!entry.actions.length){ delete entry.actions; }
	}

	if(entry.action_options){
		entry.action_options.from.options = entry.action_options.from.options
			.map((option)=>option.items ? { ...option, items: option.items.filter(keep) } : option)
			.filter((option)=>option.items ? option.items.length : keep(option));
		if(!entry.action_options.from.options.length){ delete entry.action_options; }
	}

	if(!entry.actions && !entry.action_options){ return false; }
	entry.multiattack_type = entry.actions ? 'actions' : 'action_options';
	return true;
};

/**
 * Split a monster whose stat block covers several forms into one monster per form, like the
 * 2014 data. Entries tagged "Form Only" go only to their forms; untagged entries go to all.
 */
export const splitForms = (base, imageFor, speedLineFor)=>{
	const set = FORM_SETS[base.index];
	if(!set){ return [base]; }

	const speedLine = base.index === 'vampire' ? undefined : speedLineFor();

	const sizes = formSizes(base);
	const animalKey = set[2][0];
	const refs = set.map(([key, label])=>({
		index: `${base.index}-${key}`,
		name: `${base.name}, ${label} Form`,
		url: `/api/2024/monsters/${base.index}-${key}`
	}));

	return set.map(([key, label], position)=>{
		const form = structuredClone(base);
		form.index = refs[position].index;
		form.name = refs[position].name;
		form.url = refs[position].url;
		form.image = imageFor(form.index);
		form.forms = refs.filter((_, other)=>other !== position);

		if(base.index === 'vampire'){
			if(sizes[key]){ Object.assign(form, { size: sizes[key].size, speed: sizes[key].speed }); }
		}
		else{
			const isAnimal = key === animalKey;
			const size = key === 'human' ? undefined : sizes[isAnimal ? 'animal' : 'hybrid'].size;
			if(size){ form.size = size; }
			form.speed = lycanthropeSpeed(speedLine, animalKey, isAnimal);
		}

		SECTIONS.filter((section)=>form[section]).forEach((section)=>{
			form[section] = form[section]
				.filter((entry)=>!formsOf(entry) || formsOf(entry).includes(key))
				.map((entry)=>({ ...entry, name: entry.name.replace(FORM_TAG, '') }));
		});

		const names = new Set(SECTIONS.flatMap((section)=>form[section] || []).map((entry)=>entry.name));
		form.actions = form.actions.filter((entry)=>!entry.multiattack_type || pruneMultiattack(entry, names));

		SECTIONS.filter((section)=>form[section] && !form[section].length).forEach((section)=>{ delete form[section]; });

		return form;
	});
};
