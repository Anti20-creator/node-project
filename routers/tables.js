const express = require('express')
const {authenticateAccessToken} = require("../middlewares/auth");
const router = express.Router()
const fs = require("fs")
const crypto = require('crypto')
const Httpresponse = require('../utils/ErrorCreator')

const Table = require('../models/TableModel')
const Restaurant = require('../models/RestaurantModel')
const Menu = require('../models/MenuModel')
const {createInvoice} = require("../utils/InvoiceCreator");

router.post('/book', authenticateAccessToken, async(req, res) => {

    const { tableId } = req.body;

    const table = await Table.findById(tableId).exec()

    if(!table) {
        return Httpresponse.NotFound(res, "No table found with given ID!")
    }

    if(table.inLiveUse) {
        return Httpresponse.Conflict(res, "This table is already in live use!")
    }

    await table.updateOne({
        inLiveUse: true
    })
    console.log(req.user.restaurantId)
    req.app.get('socketio').to(req.user.restaurantId).emit('notify-new-guest', tableId)

    return Httpresponse.OK(res, "Table booked for live use!")

})

router.post('/order', authenticateAccessToken, async(req, res) => {

    const { items, tableId } = req.body;

    const table = await Table.findById(tableId).exec()
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!table.inLiveUse) {
        return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    for(const item of items) {
        if(!Object.keys(menu.items).includes(item.category)){
            if(!Object.keys(menu.items[item.category]).includes(item.food)) {
                return Httpresponse.BadRequest(res, "One or more items are not represented in the menu.")
            }
        }
    }

    table.liveOrders = [
        ...table.liveOrders.concat(items)
    ]
    await table.save()

    return Httpresponse.Created(res, "Orders added!")
})

router.delete('/remove-order', authenticateAccessToken, async(req, res) => {

    const { name, tableId } = req.body
    const table = await Table.findById(tableId).exec()

    if(!table.inLiveUse) {
        return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    table.liveOrders = table.liveOrders.filter(order => order.food !== name)
    await table.save()

    return Httpresponse.OK(res, "Order removed!")
})

router.get('/:tableId', authenticateAccessToken, async(req, res) => {

    const table = await Table.findById(req.params.tableId).exec()
    const restaurant = await Restaurant.findById(req.user.restaurantId).exec()
    if(!table || !restaurant) {
        return Httpresponse.NotFound(res, "No table found with given ID!")
    }

    if(!table.inLiveUse){
        return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    const items = table.liveOrders
    if(items.length === 0) {
        return Httpresponse.BadRequest(res, "No items were ordered!")
    }

    const invoiceId = crypto.randomBytes(10).toString('hex')
    const invoiceName = "Invoice - " + new Date().toISOString().split('T')[0] + "_" + invoiceId + ".pdf"
    createInvoice(items, invoiceName, invoiceId);

    table.liveOrders = []
    table.inLiveUse = false
    await table.save()

    return Httpresponse.Created(res, "Receipt generated!")

})

module.exports = router