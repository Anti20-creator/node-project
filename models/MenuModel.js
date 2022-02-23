const mongoose = require("mongoose");

const MenuModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    items: {
        type: Object,
        default: {}
    },
    icons: {
	    type: Object,
        default: {}
    }
}, { minimize: false })

const menuMongooseModel = mongoose.model('Menu', MenuModel)

menuMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

module.exports = menuMongooseModel