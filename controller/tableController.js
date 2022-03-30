const Table = require('../models/TableModel')
const Httpresponse = require('../utils/ErrorCreator')

const findById = async(res, id) => {
    const table = await Table.findById(id).exec()
    if(!table) {
        return Httpresponse.NotFound(res, "Table not found with given id!")
    }

    return table
}

const findByIds = async(res, tableId, restaurantId) => {
    const table = await Table.findOne({RestaurantId: restaurantId, _id: tableId}).exec()
    if(!table) {
        throw new Error("Table not found with given id!")
    }

    return table
}

const checkIsTableInUse = (res, table, expected = false) => {
    if(table.inLiveUse === expected) {
        throw new Error("Current table is not in live use!")
    }
}

const modifyTableUse = async(req, table, value) => {
    table.inLiveUse = value
    await table.save()
    if(value) {
        req.app.get('socketio').to('restaurant:' + req.user.restaurantId).emit('notify-new-guest', table._id)
    }else{
        req.app.get('socketio').to('restaurant:' + req.user.restaurantId).emit('guest-leaved', table._id)
    }
}

const getAll = async(restaurantId) => {
    return await Table.find({ RestaurantId: restaurantId }).exec()
}

module.exports = {findById, checkIsTableInUse, modifyTableUse, getAll, findByIds}