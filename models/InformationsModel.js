const mongoose = require('mongoose')

const InformationsModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    city: {
        type: String
    },
    postalCode: {
        type: String
    },
    address: {
        type: String
    },
    taxNumber: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    openingTimes: {
        type: Array,
        default: []
    },
    timeBeforeLastAppointment: {
        type: Number
    }
})

const informationsMongooseModel = mongoose.model('Information', InformationsModel)

informationsMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

module.exports = informationsMongooseModel
