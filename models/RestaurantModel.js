const mongoose = require('mongoose')

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
    }
})

module.exports = mongoose.model('Restaurant', Restaurant)