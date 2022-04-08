const Table = require('../models/TableModel')

class TableNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'TableNotFoundError'
    }
}
class TableUseNotCorrect extends Error {
    constructor(message) {
        super(message)
        this.name = 'TableUseNotCorrect'
    }
}

const findById = async(id) => {
    const table = await Table.findById(id).exec()
    if(!table) {
        throw new TableNotFoundError("table-not-found")
    }

    return table
}

const findByIds = async(tableId, restaurantId) => {
    const table = await Table.findOne({RestaurantId: restaurantId, _id: tableId}).exec()
    if(!table) {
        throw new TableNotFoundError("table-not-found")
    }

    return table
}

const checkIsTableInUse = (table, expected = false) => {
    if(table.inLiveUse === expected) {
        throw new TableUseNotCorrect("table-use-incorrect")
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