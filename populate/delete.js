require('dotenv').config()
const mongoose = require('mongoose')

const Appointment      = require('../models/AppointmentModel')

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(async () => {
    
    const appointments = await Appointment.find({}).exec()

    for(const appointment of appointments) {
        appointment.day  = new Date(new Date(appointment.date).setUTCHours(0, 0, 0, 0))
        appointment.time = new Date(appointment.date).getUTCHours() + ':' + new Date(appointment.date).getUTCMinutes()
        await appointment.save()
    }

    await mongoose.connection.close()

})