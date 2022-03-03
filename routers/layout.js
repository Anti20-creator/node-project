const express = require('express')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth");
const router = express.Router()

const Httpresponse = require('../utils/ErrorCreator')
const Table = require('../models/TableModel')
const Layout = require('../models/LayoutModel')

router.post('/save', authenticateAdminAccessToken, async (req, res) => {

    const {newTables, removedTables, updatedTables} = req.body

    const layout = await Layout.findOne({
        RestaurantId: req.user.restaurantId
    });
    if(!layout) {
        return Httpresponse.NotFound(res, "No layout found!")
    }

    if(removedTables.length > 0) {
        const askedForRemoveTables = await Table.collection.find( { _id: { $in: removedTables}, RestaurantId: req.user.restaurantId } ).toArray()
        console.log(askedForRemoveTables.filter(table => table.inLiveUse))
        if (!askedForRemoveTables.filter(table => table.inLiveUse).length) {
            return Httpresponse.Conflict(res, "You can't remove a table which is in live use!")
        }
        
        const appointments = await Table.collection.find({RestaurantId: req.user, TableId: {$in: removedTables}, day: {}}).toArray()
        if(!appointments.filter(appointment => new Date() < new Date(appointment.day)).length) {
            return Httpresponse.Conflict(res, "You can't remove a table which has booking for the future!")
        }
    }
    

    let resultTables = layout.tables.filter(x => !removedTables.includes(x)).slice();

    for (const updatedTable of updatedTables) {
        // Maybe we should check if the table exists
        const idx = resultTables.findIndex(table => table.TableId === updatedTable.databaseID)
        resultTables[idx] = {...updatedTable, TableId: updatedTable.databaseID}
    }

    for (const newTable of newTables) {
        const table = await new Table({
            RestaurantId: req.user.restaurantId
        }).save()
        resultTables.push({
            ...newTable,
            TableId: table._id
        })
    }

    for(const table of removedTables) {
        await Table.deleteOne({ _id: table })
    }

    resultTables = resultTables.filter(table => !removedTables.includes(table.TableId))

    await layout.updateOne({
        tables: resultTables
    })
    //req.app.get('socketio').broadcast.to(req.user.restaurantId).emit('layout-modified', resultTables)

    return Httpresponse.OK(res, resultTables)
})

router.get('/', authenticateAccessToken, async(req, res) => {

    const layout = await Layout.findOne({RestaurantId: req.user.restaurantId}).exec();
    if(!layout) {
        return Httpresponse.NotFound(res, "No tables found!")
    }

    return Httpresponse.OK(res, layout.tables)

})

module.exports = router
