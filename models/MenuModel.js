const mongoose = require("mongoose");

const MenuModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    items: {
        type: Object
    },
    icons: {
	type: Object
    }
}, { minimize: false })

module.exports = mongoose.model('Menu', MenuModel)
