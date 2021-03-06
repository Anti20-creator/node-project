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

const restaurantMongooseModel = mongoose.model('Restaurant', Restaurant)

if (process.env.TESTING === '0') restaurantMongooseModel.collection.createIndex( { ownerId: 1 }, { unique: true } )

module.exports = restaurantMongooseModel