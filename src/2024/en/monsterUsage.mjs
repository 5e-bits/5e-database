const NAME_USAGE = /^(.+?) \(([^()]*)\)$/;
const PER_DAY_IN_LAIR = /^(\d+)\/Day, or (\d+)\/Day in Lair$/;
const RECHARGE_AFTER_REST = /^Recharge after a Short or Long Rest$/;
const RECHARGE_ON_ROLL = /^Recharge (\d+)(?:–\d+)?$/;
const PER_DAY = /^(\d+)\/Day(?:; (.+))?$/;

/**
 * The gist leaves a trait or action's usage (recharge, per-day count, and so on) as unparsed
 * text in its name; `times_in_lair` is only ever seen on special abilities (Legendary
 * Resistance), matching SpecialAbilityUsageSchema.
 */
const parseUsage = (name, isSpecialAbility)=>{
	const match = name.match(NAME_USAGE);
	if(!match){ return {}; }
	const [, base, suffix] = match;

	const perDayInLair = isSpecialAbility && suffix.match(PER_DAY_IN_LAIR);
	if(perDayInLair){
		return { name: base, usage: { type: 'per day', times: Number(perDayInLair[1]), times_in_lair: Number(perDayInLair[2]) } };
	}

	if(RECHARGE_AFTER_REST.test(suffix)){
		return { name: base, usage: { type: 'recharge after rest', rest_types: ['short', 'long'] } };
	}

	const rechargeOnRoll = suffix.match(RECHARGE_ON_ROLL);
	if(rechargeOnRoll){
		return { name: base, usage: { type: 'recharge on roll', dice: '1d6', min_value: Number(rechargeOnRoll[1]) } };
	}

	const perDay = suffix.match(PER_DAY);
	if(perDay){
		const usage = { type: 'per day', times: Number(perDay[1]) };
		return perDay[2] ? { name: `${base} (${perDay[2]})`, usage } : { name: base, usage };
	}

	return {};
};

export const addUsage = (result, entrySections)=>{
	entrySections.forEach((key)=>{
		(result[key] || []).forEach((entry)=>{
			const { name, usage } = parseUsage(entry.name, key === 'special_abilities');
			if(usage){
				entry.name = name;
				entry.usage = usage;
			}
		});
	});
};
