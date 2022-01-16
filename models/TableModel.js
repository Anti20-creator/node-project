const mongoose = require('mongoose')

const OrderModel = new mongoose.Schema({
    food: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
})

const TableModel = new mongoose.Schema({
    RestaurantId: {
        type: Number,
        required: true
    },
    liveOrders: {
        type: OrderModel
    },
    inLiveUse: {
        type: Boolean,
        required: true
    }
})

module.exports = mongoose.model('Table', TableModel)