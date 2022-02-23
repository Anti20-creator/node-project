const mongoose = require('mongoose')

const AppointmentModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    TableId: {
        type: String,
        required: true
    },
    peopleCount: {
        type: Number,
        required: true
    },
    day: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    email: {
	    type: String
    }
})

const appointmentMongooseModel = mongoose.model('Appointment', AppointmentModel)

appointmentMongooseModel.collection.createIndex( { RestaurantId: 1, TableId: 1, day: 1 }, { unique: true, sparse: false } )

module.exports = appointmentMongooseModel
