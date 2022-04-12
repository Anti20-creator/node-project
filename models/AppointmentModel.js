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
	    type: Date
    },
    code: {
        type: String,
        required: true
    },
    email: {
	    type: String,
        validate: {
            validator: function(email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'invalid-email'
        }
    },
    confirmed: {
        type: Boolean,
        default: false
    }
})

const appointmentMongooseModel = mongoose.model('Appointment', AppointmentModel)

if (process.env.TESTING === '0') appointmentMongooseModel.collection.createIndex( { RestaurantId: 1, TableId: 1, date: 1 } )

module.exports = appointmentMongooseModel
