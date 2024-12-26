const equipment = require('../5e-SRD-Equipment.json');
const categories = require('../5e-SRD-Equipment-Categories.json');
let errorFound = false;

//Validates items in the "5e-SRD-Equipment.json" file against the categories of the "5e-SRD-Equipment-Categories.json" file
equipment.forEach(item => {
    item.equipment_categories.forEach(itemCategory => {
        let categoryFound = false;
        categories.forEach(category => {
            if (category.index == itemCategory.index) {
                category.equipment.forEach(piece => {
                    if (piece.index == item.index) {
                        categoryFound = true;
                    }
                });
            }
        });
        if (!categoryFound) {
            errorFound = true;
            console.log(`ERROR: Category "${itemCategory.index}" for "${item.name}" not found in "5e-SRD-Equipment-Categories.json" file`);
        }
    });
});

//Validates categories in the "5e-SRD-Equipment-Categories.json" file against items in the "5e-SRD-Equipment.json" file
categories.forEach(category => {
    category.equipment.forEach(piece => {
        let pieceIsInEquipmentFile = false;
        equipment.forEach(item => {
            if (item.index == piece.index) {
                pieceIsInEquipmentFile = true;
                let categoryFoundInItem = false;
                item.equipment_categories.forEach(itemCategory => {
                    if (itemCategory.index == category.index) {
                        categoryFoundInItem = true;
                    }
                });
                if (!categoryFoundInItem) {
                    errorFound = true;
                    console.log(`ERROR: Category "${category.index}" not found for "${item.name}" in "5e-SRD-Equipment.json" file`);
                }
            }
        });
    });
});

if (!errorFound) {
    console.log("No inconsistencies found between '5e-SRD-Equipment.json' and '5e-SRD-Equipment-Categories.json' files.");
}