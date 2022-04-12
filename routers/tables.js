const express                             = require('express')
const {authenticateAccessToken}           = require("../middlewares/auth");
const router                              = express.Router()
const Httpresponse                        = require('../utils/ErrorCreator')
const TableController                     = require('../controller/tableController')
const RequestValidator                    = require('../controller/bodychecker')
const MenuController                      = require('../controller/menuController')
const { createInvoiceName }               = require('../utils/invoiceName')
const {createInvoice, createMultiInvoice} = require("../utils/InvoiceCreator");
const { catchErrors }                     = require('../utils/ErrorHandler')

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {
    const tables = await TableController.getAll(req.user.restaurantId)

    return Httpresponse.OK(res, tables)
}))

router.post('/book', authenticateAccessToken, catchErrors(async(req, res) => {

    const { tableId } = RequestValidator.destructureBody(req, res, {tableId: 'string'})
    
    const table = await TableController.findById(tableId)
    TableController.checkIsTableInUse(table, true)
    await TableController.modifyTableUse(req, table, true)

    return Httpresponse.OK(res, "Table booked for live use!")
}))

router.post('/free-table', authenticateAccessToken, catchErrors(async(req, res) => {

    const { tableId } = RequestValidator.destructureBody(req, res, {tableId: 'string'})

    const table = await TableController.findById(tableId)
    if(table.liveOrders.length > 0) {
	    return Httpresponse.BadRequest(res, "Table have orders!")
    }

    await TableController.modifyTableUse(req, table, false)

    return Httpresponse.OK(res, "Table updated!")
}))

router.post('/order', authenticateAccessToken, catchErrors(async(req, res) => {

    const { item, tableId, socketId } = RequestValidator.destructureBody(req, res, {item: 'object', tableId: 'string', socketId: 'string'})

    const table = await TableController.findById(tableId)
    const menu = await MenuController.findById(req.user.restaurantId)

    TableController.checkIsTableInUse(table)

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
        const quantityBefore = table.liveOrders[index].quantity
        table.liveOrders[index].set("quantity", quantityBefore + 1)
        table.markModified('liveOrders')
    }

    await table.save()
    console.log(process.env.PRODUCTION)
    if (process.env.PRODUCTION != '0') req.app.get('socketio').to('table:' + tableId).emit('order-added', item, socketId)

    return Httpresponse.Created(res, "Orders added!")
}))

router.delete('/remove-order', authenticateAccessToken, catchErrors(async(req, res) => {

    const { name, tableId, socketId } = RequestValidator.destructureBody(req, res, {name: 'string', tableId: 'string', socketId: 'string'})
    const table = await TableController.findById(tableId)

    TableController.checkIsTableInUse(table)

    table.liveOrders = table.liveOrders.filter(order => order.name !== name)
    await table.save()
    req.app.get('socketio').to('table:' + tableId).emit('order-removed', name, socketId)

    return Httpresponse.OK(res, "Order removed!")
}))

router.post('/increase-order', authenticateAccessToken, catchErrors(async(req, res) => {

    const { name, tableId, socketId } = RequestValidator.destructureBody(req, res, {name: 'string', tableId: 'string', socketId: 'string'})
    const table = await TableController.findById(tableId)

    TableController.checkIsTableInUse(table)

    table.liveOrders.find(item => item.name === name).quantity += 1

    table.markModified('liveOrders')
    await table.save()
    req.app.get('socketio').to('table:' + tableId).emit('increase-order', name, socketId)

    return Httpresponse.OK(res, "Order quantity increased!")
}))

router.post('/decrease-order', authenticateAccessToken, catchErrors(async(req, res) => {

    const { name, tableId, socketId } = RequestValidator.destructureBody(req, res, {name: 'string', tableId: 'string', socketId: 'string'})
    const table = await TableController.findById(tableId)

    TableController.checkIsTableInUse(table)

    if (table.liveOrders.find(item => item.name === name).quantity === 1) {
	    table.liveOrders = table.liveOrders.filter(item => item.name !== name)
    }else{
        table.liveOrders.find(item => item.name === name).quantity -= 1
        table.markModified('liveOrders')
    }

    await table.save()
    req.app.get('socketio').to('table:' + tableId).emit('decrease-order', name, socketId)

    return Httpresponse.OK(res, "Order quantity decreased!")
}))

router.get('/orders/:tableId', authenticateAccessToken, catchErrors(async(req, res) => {
    
    const { tableId } = RequestValidator.destructureParams(req, res, {tableId: 'string'})

    const table = await TableController.findById(tableId)
    TableController.checkIsTableInUse(table)

    return Httpresponse.OK(res, table.liveOrders)
}))

router.get('/:tableId', authenticateAccessToken, catchErrors(async(req, res) => {

    const { tableId } = RequestValidator.destructureParams(req, res, {tableId: 'string'})

    const table = await TableController.findById(tableId)
    //const restaurant = await RestaurantController.findByAuth(req, res)

    TableController.checkIsTableInUse(table)

    const items = table.liveOrders
    if(items.length === 0) {
        return Httpresponse.BadRequest(res, "No items were ordered!")
    }

    const { invoiceId, invoicePrefix, invoiceName } = createInvoiceName(req.user.restaurantId)
    await createInvoice(items, invoiceName, invoiceId, req.user.restaurantId, req.user.email, async() => {

        table.liveOrders = []
        await TableController.modifyTableUse(req, table, false)
    
        return Httpresponse.Created(res, invoicePrefix + '.pdf')
    })
}))

router.post('/:tableId/split', authenticateAccessToken, catchErrors(async(req, res) => {

    const { tableId } = RequestValidator.destructureParams(req, res, {tableId: 'string'})
    const { items } = RequestValidator.destructureBody(req, res, {items: 'object'})

    const table = await TableController.findById(tableId)
    TableController.checkIsTableInUse(table)

    const tableItems = table.liveOrders
    for(const item of items) {
        const searchForItem = tableItems.findIndex(tableItem => tableItem.name === item.name)
        if(searchForItem === -1) {
            return Httpresponse.BadRequest(res, "Couldn't find given orders!")
        }
        if(item.quantity > tableItems[searchForItem].quantity) {
            return Httpresponse.BadRequest(res, "Too much items!")
        }

        if(item.quantity === tableItems[searchForItem].quantity) {
            tableItems.splice(searchForItem, 1)
        }else{
            tableItems[searchForItem].quantity -= item.quantity
        }
    }
    
    const { invoiceId, invoicePrefix, invoiceName } = createInvoiceName(req.user.restaurantId)
    await createInvoice(items, invoiceName, invoiceId, req.user.restaurantId, req.user.email, async() => {
        
        table.liveOrders = tableItems
        await table.save()
        req.app.get('socketio').to('table:' + req.params.tableId).emit('orders-modified', tableItems)

        return Httpresponse.Created(res, invoicePrefix + '.pdf')
    })
}))

router.post('/:tableId/split-equal', authenticateAccessToken, catchErrors(async(req, res) => {

    const { tableId } = RequestValidator.destructureParams(req, res, {tableId: 'string'})
    const { peopleCount } = RequestValidator.destructureBody(req, res, {peopleCount: 'number'})

    const table = await TableController.findById(tableId)
    TableController.checkIsTableInUse(table)

    const items = table.liveOrders
    if(items.length === 0) {
        return Httpresponse.BadRequest(res, "No items were ordered!")
    }

    const { invoiceId, invoicePrefix, invoiceName } = createInvoiceName(req.user.restaurantId)
    await createMultiInvoice(items, invoiceName, invoiceId, req.user.restaurantId, req.user.email, peopleCount, async() => {
        table.liveOrders = []
        await TableController.modifyTableUse(req, table, false)

        return Httpresponse.Created(res, invoicePrefix + '.pdf')
    })
}))

module.exports = router
