const mongoose = require('mongoose')

const OrderModel = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        validate: {
            validator: function(name) {
                return name.length > 0
            },
            message: 'short-foodname'
        }
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'small-quantity']
    },
    category: {
        type: String,
        required: true,
        validator: function(name) {
            return name.length > 0
        },
        message: 'short-foodname'
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

if (process.env.TESTING === '0') tableMongooseModel.collection.createIndex( { RestaurantId: 1 } )

module.exports = tableMongooseModel