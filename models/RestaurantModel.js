const mongoose = require('mongoose')
const Layout   = require('../models/LayoutModel')
const Menu   = require('../models/MenuModel')

const Restaurant = new mongoose.Schema({
    ownerId: {
        type: String,
        required: true
    },
    ownerEmail: {
        type: String,
        required: true
    },
    restaurantName: {
        type: String,
        required: true
    },
    employees: {
        type: Array,
        required: true
    },
    secretPin: {
        type: String,
        required: true
    },
    invited: {
        type: Array,
        default: []
    }
})

Restaurant.post('save', async(doc, next) => {
    await Layout.create({
        RestaurantId: doc._id
    })
    await Menu.create({
        RestaurantId: doc._id
    })
})

module.exports = mongoose.model('Restaurant', Restaurant)
