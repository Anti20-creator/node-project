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
        default: []
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

module.exports = mongoose.model('Restaurant', Restaurant)
