import { parseSpellLists } from './monsterSpellcasting.mjs';

const LABEL = /^(Skills|Gear|Resistances|Immunities|Vulnerabilities|Senses|Languages|CR) /;
const MID_LINE_LABEL = /(?<=\S) ?(?=(?:Skills|Gear|Resistances|Immunities|Vulnerabilities|Senses|Languages) [A-Z]|CR \d)/g;
const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

/**
 * The PDF extraction splits ability scores from their labels, wraps long header fields
 * onto extra lines, and runs others together. The header runs from the first labelled
 * line to the CR line.
 */
export const normalizeText = (rawText)=>{
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

const numberFrom = (data, pattern)=>Number((( data.match(pattern) || [])[1] || '').replace(/,/g, ''));

/**
 * One entry per stat block in the normalized text, with the fields the gist lacks.
 */
export const parseTextBlocks = (normalizedText)=>{
	const blocks = normalizedText.split(/\nMOD/);
	blocks.splice(0, 1);

	console.log('Text data array length:', blocks.length);

	return blocks.map((data, index)=>({
		fingerprint: [
			...['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'].map((stat)=>( data.match(new RegExp(`^${stat} (\\d+)`, 'm')) || [])[1]),
			( data.match(/^CR (\S+) /m) || [])[1]
		].join('|'),
		skills: ( data.match(/^(Skills .*)$/gm) || ['Skills None'] )[0].slice(7),
		gear: ( data.match(/^(Gear .*)$/gm) || ['Gear None'] )[0].slice(5),
		/**
		 * The gist's own `languages` extraction truncates a number of monsters mid-sentence;
		 * the wrapped Languages line is already joined in the normalized text.
		 */
		languages: ( data.match(/^Languages (.*)$/m) || [] )[1]?.replace(/'/g, '’'),
		passive_perception: Number(( data.match(/^Senses .*Passive Perception (\d+)/m) || [])[1]),
		position: index,
		lines: data.split('\n'),
		spellLists: parseSpellLists(data),
		xp: numberFrom(data, /^CR \S+ \((?:XP )?([\d,]+)/m),
		xp_in_lair: numberFrom(data, /^CR \S+ \(XP [\d,]+, or ([\d,]+) in lair/m) || undefined,
		proficiency_bonus: Number (( data.match(/( PB \+\d\))/g) || [' PB +0'] )[0].slice(5,6))
	}));
};

/**
 * Stat block and group titles, longest first, so trailing titles can be matched. A title is
 * usually followed by its own AC line, but a group title (e.g. "Toughs") can have none of its
 * own and lead straight into the ability-score table instead.
 */
export const findBlockTitles = (normalizedText)=>{
	const lines = normalizedText.split('\n');
	return lines
		.filter((line, index)=>/^[A-Z][A-Za-z’' -]+$/.test(line) && lines.slice(index + 1, index + 9).some((next)=>/^AC \d/.test(next) || next.includes('MOD SAVE')))
		.map((line)=>line.trim())
		.sort((a, b)=>b.length - a.length);
};

/**
 * Text blocks are not reliably in the same order as the gist, and grouped stat blocks
 * have no per-monster name, so pair them on ability scores plus CR instead.
 */
export const createTextFinder = (textData)=>{
	const claimed = new Set();

	return (monster)=>{
		const fingerprint = [...ABILITIES.map((stat)=>monster[stat]), monster.challenge_rating].join('|');
		const match = textData.findIndex((data, index)=>!claimed.has(index) && data.fingerprint === fingerprint);
		if(match < 0){ throw new Error(`No text data for ${monster.slug} (${fingerprint})`); }
		claimed.add(match);
		return textData[match];
	};
};

/**
 * Header lines can be displaced in the PDF text, so find a monster's Speed line from its
 * own hit points line instead of from its position. The type line tells apart monsters
 * that share hit points.
 */
export const findSpeedLine = (normalizedText, monster, typePattern)=>{
	const lines = normalizedText.replace(/−/g, '-').split('\n');
	const speeds = lines
		.map((line, index)=>line === `HP ${monster.hit_points} (${monster.hit_points_roll})` && typePattern.test(lines[index - 2]) ? lines[index + 1] : undefined)
		.filter((next)=>next?.startsWith('Speed '));

	if(speeds.length !== 1){ throw new Error(`Expected one Speed line for ${monster.index}, found ${speeds.length}`); }
	return speeds[0].slice('Speed '.length);
};
