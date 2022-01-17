const express = require('express')
const {authenticateAccessToken} = require("../middlewares/auth");
const router = express.Router()

const Httpresponse = require('../utils/ErrorCreator')
const Table = require('../models/TableModel')
const Layout = require('../models/LayoutModel')

router.post('/save', authenticateAccessToken, async (req, res) => {

    // TODO: authenticateAdminAccesstoken

    const {newTables, removedTables} = req.body

    const layout = await Layout.findOne({
        RestaurantId: req.user.restaurantId
    });
    if(!layout) {
        return Httpresponse.NotFound(res, "No layout found!")
    }

    const resultTables = layout.tables.filter(x => !removedTables.includes(x)).slice();
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
        await table.delete();
    }

    await layout.updateOne({
        tables: resultTables
    })

    return Httpresponse.OK(res, "Layout updated!")
})

router.get('/', authenticateAccessToken, async(req, res) => {

    const layout = await Layout.findOne({RestaurantId: req.user.restaurantId}).exec();
    if(!layout) {
        return Httpresponse.NotFound(res, "No tables found!")
    }

    return Httpresponse.OK(res, layout.tables)

})

module.exports = router