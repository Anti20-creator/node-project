const mongoose = require("mongoose");

const MenuModel = new mongoose.Schema({
    RestaurantId: {
        type: Number,
        required: true
    },
    items: {
        type: Object
    }
})

module.exports = mongoose.model('Menu', MenuModel)