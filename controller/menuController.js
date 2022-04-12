const Menu = require('../models/MenuModel')

class MenuNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'MenuNotFoundError'
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

module.exports = { findById, getAllFoodNames }