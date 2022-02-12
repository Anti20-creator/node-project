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

router.post('/free-table', authenticateAccessToken, async(req, res) => {

    const { tableId } = req.body

    const table = await Table.findById(tableId).exec()
    if(!table) {
	return Httpresponse.NotFound(res, "Table not found!")
    }

    if(table.liveOrders.length > 0) {
	return Httpresponse.BadRequest(res, "Table have orders!")
    }

    table.inLiveUse = false

    await table.save()
    req.app.get('socketio').to(req.user.restaurantId).emit('guest-leaved', tableId)

    return Httpresponse.OK(res, "Table updated!")

})

router.post('/order', authenticateAccessToken, async(req, res) => {

    const { item, tableId, socketId } = req.body;

    const table = await Table.findById(tableId).exec()
    const menu = await Menu.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!table.inLiveUse) {
        return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    if(!Object.keys(menu.items).includes(item.category)){
        if(!Object.keys(menu.items[item.category]).includes(item.name)) {
            return Httpresponse.BadRequest(res, "One or more items are not represented in the menu.")
        }
    }
    const price = menu.items[item.category][item.name].price
    item.price = price

    const index = table.liveOrders.findIndex(order => order.name === item.name)
    if (index === -1) {
	table.liveOrders = [ ...table.liveOrders.concat([item]) ]
    }else{
	table.liveOrders[index].quantity += 1
    }

    await table.save()
    req.app.get('socketio').to(tableId).emit('order-added', item, socketId)

    return Httpresponse.Created(res, "Orders added!")
})

router.delete('/remove-order', authenticateAccessToken, async(req, res) => {

    const { name, tableId, socketId } = req.body
    const table = await Table.findById(tableId).exec()

    if(!table.inLiveUse) {
        return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    table.liveOrders = table.liveOrders.filter(order => order.name !== name)
    await table.save()
    req.app.get('socketio').to(tableId).emit('order-removed', name, socketId)

    return Httpresponse.OK(res, "Order removed!")
})

router.post('/increase-order', authenticateAccessToken, async(req, res) => {

    const { name, tableId, socketId } = req.body
    const table = await Table.findById(tableId).exec()

    if(!table.inLiveUse) {
	return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    table.liveOrders.find(item => item.name === name).quantity += 1

    await table.save()
    req.app.get('socketio').to(tableId).emit('increase-order', name, socketId)

    return Httpresponse.OK(res, "Order quantity increased!")
})

router.post('/decrease-order', authenticateAccessToken, async(req, res) => {

    const { name, tableId, socketId } = req.body
    const table = await Table.findById(tableId).exec()

    if(!table.inLiveUse) {
	return Httpresponse.BadRequest(res, "Table is not in use!")
    }

    if (table.liveOrders.find(item => item.name === name).quantity === 1) {
	table.liveOrders = table.liveOrders.filter(item => item.name !== name)
    }else{
	table.liveOrders.find(item => item.name === name).quantity -= 1
    }

    await table.save()
    req.app.get('socketio').to(tableId).emit('decrease-order', name, socketId)

    return Httpresponse.OK(res, "Order quantity decreased!")
})

router.get('/orders/:tableId', authenticateAccessToken, async(req, res) => {
    const table = await Table.findById(req.params.tableId).exec()

    if(!table.inLiveUse)
	return Httpresponse.OK(res, [])

    return Httpresponse.OK(res, table.liveOrders)
})

router.get('/:tableId', authenticateAccessToken, async(req, res) => {

    console.log(req.params.tableId)

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
    const file = createInvoice(items, invoiceName, invoiceId);

    table.liveOrders = []
    table.inLiveUse = false
    await table.save()
    //req.app.get('socketio').to(req.user.restaurantId).emit('guest-leaved', req.params.tableId)

    return Httpresponse.Created(res, invoiceName)

})

router.get('/', authenticateAccessToken, async(req, res) => {
    const tables = await Table.find({RestaurantId: req.user.restaurantId}).exec()

    return Httpresponse.OK(res, tables)
})

module.exports = router
