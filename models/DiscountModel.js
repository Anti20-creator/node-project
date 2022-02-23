const mongoose = require('mongoose')

const DiscountModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    items: {
        type: Array,
        default: []
    },
    categories: {
        type: Array,
        default: []
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    discount: {
        type: Number
    }
})

const discountMongooseModel = mongoose.model('Discount', DiscountModel)

module.exports = discountMongooseModel