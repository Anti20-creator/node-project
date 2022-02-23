const express = require('express')
const router = express.Router()
const Httpresponse = require('../utils/ErrorCreator')

const Menu = require('../models/MenuModel')
const {authenticateAccessToken} = require("../middlewares/auth");

router.post('/add-category', authenticateAccessToken,async(req, res) => {

    const { category, categoryIcon } = req.body

    if(!category) {
        return Httpresponse.BadRequest(res, "One or more parameters are missing!")
    }
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    const items = { ...menu.items }
    const icons = { ...menu.icons }

    if(!items[category]) {
        items[category] = {}
    }
    if(!icons[category]) {
	    icons[category] = categoryIcon
    }

    await menu.updateOne({
        items,
	icons
    }).exec()

    return Httpresponse.Created(res, "Category added!")
})

router.post('/modify-category', authenticateAccessToken, async(req, res) => {

    const { category, oldCategory, categoryIcon } = req.body

    if(!category || !oldCategory) {
        return Httpresponse.BadRequest(res, "One or more parameters are missing!")
    }
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    const items = { ...menu.items }
    const icons = { ...menu.icons }

    if(!items[oldCategory]) {
        return Httpresponse.NotFound(res, "No category found to update!")
    }

    if(category !== oldCategory) {
        items[category] = items[oldCategory]
        delete(items[oldCategory])
    }

    icons[category] = categoryIcon

    if(category !== oldCategory) {
        delete(icons[oldCategory])
    }

    await menu.updateOne({
        items: items,
        icons: icons
    }).exec()

    return Httpresponse.OK(res, "Category updated!")
})

router.post('/modify-item', authenticateAccessToken, async(req, res) => {

    const { name, amount, category, price, unit, oldName } = req.body

    if(!name || !amount || !category || !price || !unit || !oldName) {
        return Httpresponse.BadRequest(res, "One or more parameters are missing!")
    }
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    const items = { ...menu.items }

    if(!items[category] || !items[category][oldName]) {
        return Httpresponse.NotFound(res, "No item found to update!")
    }

    items[category][name] = {
        unit,
        amount,
        price
    }
    if(name !== oldName) {
        delete(items[category][oldName])
    }

    await menu.updateOne({
        items: items
    }).exec()

    return Httpresponse.OK(res, "Item modified!")
})


router.post('/add-item', authenticateAccessToken, async(req, res) => {

    const { name, amount, category, price, unit } = req.body

    if(!name || !amount || !category || !price || !unit) {
        return Httpresponse.BadRequest(res, "One or more parameters are missing!")
    }
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    const items = { ...menu.items }

    if(items[category] && items[category][name]) {
        return Httpresponse.Conflict(res, "There is already a product with that name on the menu!")
    }

    items[category][name] = {
        unit,
        amount,
        price
    }

    await menu.updateOne({
        items
    }).exec()

    return Httpresponse.Created(res, "Item added!")
})

router.delete('/delete-category', authenticateAccessToken, async(req, res) => {

    const { category } = req.body
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(menu.items[category]) {
        delete(menu.items[category])
        delete(menu.icons[category])
    }else{
        return Httpresponse.NotFound(res, "No item found with given parameters!")
    }

    await menu.updateOne({
        items: menu.items,
        icons: menu.icons
    })

    return Httpresponse.OK(res, "Category deleted!")

})

router.delete('/delete-item', authenticateAccessToken, async(req, res) => {

    const { name, category } = req.body
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(menu.items[category] && menu.items[category][name]) {
        delete(menu.items[category][name])
    }else{
        return Httpresponse.NotFound(res, "No item found with given parameters!")
    }

    await menu.updateOne({items: menu.items})

    return Httpresponse.OK(res, "Item deleted!")

})

router.get('/categories', async(req, res) => {
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!menu) {
        return Httpresponse.NotFound(res, "Menu not found!")
    }

    return Httpresponse.OK(res, {icons: menu.icons})
})

router.get('/', authenticateAccessToken, async(req, res) => {

    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!menu) {
        return Httpresponse.NotFound(res, "Menu not found!")
    }

    return Httpresponse.OK(res, menu)
})

module.exports = router
