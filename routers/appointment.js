const mongoose     = require('mongoose')
const express      = require('express')
const router       = express.Router()
const Httpresponse = require('../utils/ErrorCreator')
const Appointment  = require('../models/AppointmentModel')
const {sendMail}  = require('../utils/EmailSender')

function createPin() {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let pin = ''
    for (let i = 0; i < parseInt(process.env.APPOINTMENT_PIN_LENGTH); i++) {
        pin += chars[Math.floor(Math.random() * chars.length)]
    }
    return pin
}

router.post('/book', async(req, res) => {

    try {

        const {email, date, restaurantId, tableId, peopleCount} = req.body;

        // If parameters are missing then we should throw an error
        if(!date || !restaurantId || !tableId || !peopleCount) {
            return Httpresponse.BadRequest(res, "Missing parameters!")
        }

        // In normal case we set start date to 0:00 and end date next day 0:00, so we are searching in a 24h period
        let startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        let endDate = new Date(date);
        endDate.setUTCHours(0, 0, 0, 0);
        endDate.setDate(new Date(date).getDate() + 1);

        // If guests want to book for a late time, then we add 5 hours to end date.
        if(new Date(endDate) - new Date(date) <= 18_000_000) {
            endDate.setUTCHours(5, 0, 0, 0);
        }

        // If guests want to book for an early date, then we modify both start and end time to perform a better search.
        if(new Date(date) - new Date(startDate) <= 18_000_000) {
            console.log('lefut')
            startDate.setDate(new Date(date).getDate() - 1);
            startDate.setUTCHours(18, 0, 0, 0);
            endDate.setDate(new Date(date).getDate());
            endDate.setUTCHours(12, 0, 0, 0);
        }

        // Searching for a conflicting data.
        const conflictingData = await Appointment.collection.findOne({
            RestaurantId: {
                $eq: restaurantId,
            },
            TableId: {
                $eq: tableId
            },
            date: {
                $gt: startDate,
                $lt: endDate
            }
        })

        if(conflictingData) {
            return Httpresponse.BadRequest(res, "Appointment found on the given date!")
        }

        // If everything went well, then we will generate a random pin, save the appointment and send an e-mail.
        const pinCode = createPin()
        const appointment = new Appointment({
            RestaurantId: restaurantId,
            TableId: tableId,
            date: date,
            peopleCount: peopleCount,
            code: pinCode
        })

        await appointment.save()
        await sendMail(email, 'Appointment booked', `<p>${pinCode}</p>`, res)

        return Httpresponse.OK(res, pinCode)

    }catch (e) {
        return Httpresponse.BadRequest(res, e)
    }
})

router.delete('/disclaim', async(req, res) => {

    const { date, tableId, restaurantId, pin } = req.body;

    // If parameters are missing then we should throw an error
    if(!date || !restaurantId || !tableId || !pin) {
        return Httpresponse.BadRequest(res, "Missing parameters!")
    }

    // Finding the appointment
    const appointment = await Appointment.findOne({
        RestaurantId: restaurantId,
        TableId: tableId,
        date: date
    })

    if(!appointment) {
        return Httpresponse.NotFound(res, "No data exist with given parameters!");
    }

    if(appointment.code !== pin) {
        return Httpresponse.BadRequest(res, "The entered PIN is incorrect!")
    }

    await appointment.deleteOne();
    return Httpresponse.OK(res, "Your appointment has been deleted!")

})

module.exports = router