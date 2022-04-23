const Menu = require('../models/MenuModel')

class MenuNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'MenuNotFoundError'
    }
}

class CategoryError extends Error {
    constructor(message) {
        super(message)
        this.name = 'CategoryError'
    }
}

class FoodError extends Error {
    constructor(message) {
        super(message)
        this.name = 'FoodError'
    }
}

const findById = async (id) => {
    const menu = await Menu.findOne({RestaurantId: id}).exec()
    if(!menu) {
        throw new MenuNotFoundError("menu-not-found")
    }

    return menu
}

const getAllFoodNames = (menu) => {
    const result = []
    Object.keys(menu.items).map(category => {
        result.concat(Object.keys(menu.items[category]))
    })
    return result
}

const validateCategory = (name, icon) => {
    if (name.length < 1) {
        throw new CategoryError("short-categoryname")
    }
    
    if(icon.length < 1) {
        throw new CategoryError("short-iconname")
    }
}

const validateFood = (name, quantity, unit) => {
    if(name.length < 1) {
        throw new FoodError("short-foodname")
    }
    if(quantity < 1) {
        throw new FoodError("small-quantity")
    }
    if(unit.length < 1) {
        throw new FoodError("short-unitname")
    }
}

module.exports = { findById, getAllFoodNames, validateCategory, validateFood }