import { describe, expect } from "vitest";


// Function to get property type (including Array)
const getType = (item)=>{
	let result = typeof item;
	if(result == 'object' && Array.isArray(item)) result = 'array';
	return result;
}

export default function(items, mandatory, optional){
	return describe('2024 magic items test', () => {
		it('only permitted properties exist on all objects', () => {
			const foundProperties = new Set (items.map((item)=>{
				return Object.keys(item);
			}).flat());

			const permittedProperties = new Set([ Object.keys(mandatory), Object.keys(optional) ].flat());

			expect(foundProperties).toEqual(permittedProperties);
		});

		it('mandatory properties are of correct types and exist on all objects', () => {
			const testItems = items.every((item)=>{
				return Object.keys(mandatory).every((key)=>{
					return mandatory[key] === getType(item[key]);
				})
			})

			expect(testItems).toBe(true);
		});

		it('only mandatory or optional properties are of correct types on all objects', () => {
			const testItems = items.every((item)=>{
				return Object.keys(item).every((key)=>{
					return mandatory[key] === getType(item[key]) || optional[key] === getType(item[key]);
				})
			})

			expect(testItems).toBe(true);
		});
	});
}