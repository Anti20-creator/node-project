const express                   = require('express')
const router                    = express.Router()
const Httpresponse              = require('../utils/ErrorCreator')
const RequestValidator          = require('../controller/bodychecker')
const MenuController            = require('../controller/menuController')
const { catchErrors }           = require('../utils/ErrorHandler')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth");

router.post('/add-category', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { category, categoryIcon } = RequestValidator.destructureBody(req, {category: 'string', categoryIcon: 'string'})

    MenuController.validateCategory(category, categoryIcon)

    const menu = await MenuController.findById(req.user.restaurantId)
    if(!menu.items[category]) {
        menu.items[category] = {}
    }else{
        return Httpresponse.Conflict(res, "existing-category")
    }
    menu.icons[category] = categoryIcon

    menu.markModified('items')
    menu.markModified('icons')

    await menu.save()

    return Httpresponse.Created(res, "category-added")
}))

router.post('/modify-category', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { category, oldCategory, categoryIcon } = RequestValidator.destructureBody(req, {category: 'string', oldCategory: 'string', categoryIcon: 'string'})

    MenuController.validateCategory(category, categoryIcon)

    const menu = await MenuController.findById(req.user.restaurantId)

    if(!menu.items[oldCategory]) {
        return Httpresponse.NotFound(res, "category-not-found")
    }

    if(category !== oldCategory) {
        menu.items[category] = menu.items[oldCategory]
        delete(menu.items[oldCategory])
    }

    menu.icons[category] = categoryIcon
    if(category !== oldCategory) {
        delete(menu.icons[oldCategory])
    }

    menu.markModified('icons')
    menu.markModified('items')
    await menu.save()

    return Httpresponse.OK(res, "category-updated")
}))

router.post('/modify-item', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { name, amount, category, price, unit, oldName } = RequestValidator.destructureBody(req, {name: 'string', amount: 'number', category: 'string', price: 'number', unit: 'string', oldName: 'string'})

    MenuController.validateFood(name, amount, unit)
    
    const menu = await MenuController.findById(req.user.restaurantId)
    
    if(!Object.keys(menu.items).includes(category) || !menu.items[category][oldName]) {
        return Httpresponse.NotFound(res, "food-not-found")
    }
    
    menu.items[category][name] = { unit, amount, price }
    const allFoodNames = MenuController.getAllFoodNames(menu)
    if(allFoodNames.every(foodName => foodName === name).length > 1) {
        return Httpresponse.Conflict(res, "food-name-exists")
    }

    if(name !== oldName) {
        delete(menu.items[category][oldName])
    }

    menu.markModified('items')
    await menu.save()

    return Httpresponse.OK(res, "food-modified")
}))


router.post('/add-item', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { name, amount, category, price, unit } = RequestValidator.destructureBody(req, {name: 'string', amount: 'number', category: 'string', price: 'number', unit: 'string'})

    MenuController.validateFood(name, amount, unit)

    const menu = await MenuController.findById(req.user.restaurantId)
    const allFoodNames = MenuController.getAllFoodNames(menu)

    if(!Object.keys(menu.items).includes(category)) {
        return Httpresponse.BadRequest(res, "category-not-found")
    }
    
    if(allFoodNames.includes(name)) {
        return Httpresponse.Conflict(res, "food-name-exists")
    }

    menu.items[category][name] = { unit, amount, price }
    menu.markModified('items')
    await menu.save()

    return Httpresponse.Created(res, "food-added")
}))

router.delete('/delete-category', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { category } = RequestValidator.destructureBody(req, {category: 'string'})
    const menu = await MenuController.findById(req.user.restaurantId)

    if(menu.items[category]) {
        delete(menu.items[category])
        delete(menu.icons[category])
        menu.markModified('items')
        menu.markModified('icons')
    }else{
        return Httpresponse.NotFound(res, "category-not-found")
    }

    await menu.save()

    return Httpresponse.OK(res, "category-deleted")
}))

router.delete('/delete-item', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { name, category } = RequestValidator.destructureBody(req, {name: 'string', category: 'string'})
    const menu = await MenuController.findById(req.user.restaurantId)

    if(menu.items[category] && menu.items[category][name]) {
        delete(menu.items[category][name])
        menu.markModified('items')
    }else{
        return Httpresponse.NotFound(res, "food-not-found")
    }

    await menu.save()

    return Httpresponse.OK(res, "food-deleted")
}))

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {

    const menu = await MenuController.findById(req.user.restaurantId)

    return Httpresponse.OK(res, menu)
}))

module.exports = router