const Menu = require('../models/MenuModel')
const Httpresponse = require('../utils/ErrorCreator')

const findByAuth = async (res, id) => {
    const menu = await Menu.findOne({RestaurantId: id}).exec()
    if(!menu) {
        return Httpresponse.NotFound(res, "Menu not found!")
    }

    return menu
}

const getAllFoodNames = (menu) => {
    const result = []
    Object.keys(menu.items).map(category => {
        result.concat(Object.keys(menu.items[category]))
    })
    console.log(result)
    return result
}

module.exports = { findByAuth, getAllFoodNames }