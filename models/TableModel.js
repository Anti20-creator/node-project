const mongoose = require('mongoose')

const OrderModel = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    }
})

const TableModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    liveOrders: [{
        type: OrderModel,
        default: []
    }],
    inLiveUse: {
        type: Boolean,
        required: true,
        default: false
    }
})

const tableMongooseModel = mongoose.model('Table', TableModel)

tableMongooseModel.collection.createIndex( { RestaurantId: 1 } )

module.exports = tableMongooseModel