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
    date: {
        type: Date,
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

module.exports = mongoose.model('Appointment', AppointmentModel)
