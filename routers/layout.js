const express = require('express')
const {authenticateAccessToken} = require("../middlewares/auth");
const router = express.Router()

const Httpresponse = require('../utils/ErrorCreator')
const Table = require('../models/TableModel')
const Layout = require('../models/LayoutModel')

router.post('/save', authenticateAccessToken, async (req, res) => {

    // TODO: authenticateAdminAccesstoken

    const {newTables, removedTables, updatedTables} = req.body

    const layout = await Layout.findOne({
        RestaurantId: req.user.restaurantId
    });
    if(!layout) {
        return Httpresponse.NotFound(res, "No layout found!")
    }

    let resultTables = layout.tables.filter(x => !removedTables.includes(x)).slice();

    for (const updatedTable of updatedTables) {
	// Maybe we should check if the table exists
	const idx = resultTables.findIndex(table => table.TableId === updatedTable.databaseID)
	console.log(idx)
	resultTables[idx] = {...updatedTable, TableId: updatedTable.databaseID}
	console.log(resultTables[idx])
    }
    console.log(resultTables)

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
