import fs from 'fs';

const equipment = JSON.parse(fs.readFileSync(new URL('./5e-SRD-Equipment.json', import.meta.url), 'utf-8'));

const normalize = (name)=>name.toLowerCase().replace(/-/g, ' ');

const armorByName = new Map(
	equipment
		.filter((item)=>item.equipment_categories.some((category)=>category.index === 'armor'))
		.map((item)=>[normalize(item.name), item])
);

/**
 * The stat block lists worn armor and shields in its Gear line, e.g. "Chain Shirt, Shield, Spear".
 */
export const armorFromGear = (gear)=>
	gear
		.split(', ')
		.map((item)=>armorByName.get(normalize(item.replace(/ \(\d+\)$/, ''))))
		.filter(Boolean)
		.map((item)=>({ index: item.index, name: item.name, url: item.url }));
