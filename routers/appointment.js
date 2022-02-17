const mongoose     = require('mongoose')
const express      = require('express')
const router       = express.Router()
const Httpresponse = require('../utils/ErrorCreator')
const Appointment  = require('../models/AppointmentModel')
const Table        = require('../models/TableModel')
const Layout       = require('../models/LayoutModel')
const {sendMail}   = require('../utils/EmailSender')
const { authenticateAccessToken } = require('../middlewares/auth')

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

        // We have to check that given table exists
        const table = Table.findOne({
            RestaurantId: restaurantId,
            TableId: tableId
        })

        if(!table) {
            return Httpresponse.BadRequest(res, "No table found with given parameters!")
        }

        const givenDate = new Date(date);
        givenDate.setUTCHours(0, 0, 0, 0)

        const now = new Date();
        now.setUTCHours(0, 0, 0, 0)

        if(now - givenDate > 0) {
            return Httpresponse.BadRequest(res, "You can't book for the past")
        }

        if(givenDate - now > 3600 * 24 * 60 * 1000) {
            return Httpresponse.BadRequest(res, "You can't book for that date")
        }

        if(givenDate.getDate() == now.getDate() && table.inLiveUse) {
            return Httpresponse.BadRequest(res, "This table is in use at the time!")
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
	    req.app.get('socketio').to('appointment:' + restaurantId).emit('new-appointment')

        return Httpresponse.Created(res, pinCode)

    }catch (e) {
        return Httpresponse.BadRequest(res, e.message)
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

router.get('/', authenticateAccessToken, async(req, res) => {

    const appointments = await Appointment.find({ RestaurantId: req.user.restaurantId })

    return Httpresponse.OK(res, appointments)

})

router.delete('/delete-appointment/:id', authenticateAccessToken, async(req, res) => {

    const appointment = await Appointment.findById(req.params.id).exec()

    console.log(appointment)
    const email = appointment.email
    console.log(email)

    await appointment.delete()
    await sendMail(email, 'Appointment cancelled', 'A rendelése törlésre került!', res)

    return Httpresponse.OK(res, "Appointment deleted!")

})

router.post('/find-tables', authenticateAccessToken, async(req, res) => {

    try {

        const {email, date, peopleCount} = req.body;

        // If parameters are missing then we should throw an error
        /*if(!date || !email || !peopleCount) {
            return Httpresponse.BadRequest(res, "Missing parameters!")
        }*/

        // We have to check that given table exists
        const layout = await Layout.findOne({
            RestaurantId: req.user.restaurantId
        }).exec()

        if(!layout) {
            return Httpresponse.BadRequest(res, "No table found with given parameters!")
        }

	const tables = layout.tables.filter(table => table.tableCount >= peopleCount).map(table => table.TableId)
	console.log(tables)

	for (const tableId of tables) {

        const givenDate = new Date(date);
        givenDate.setUTCHours(0, 0, 0, 0)

        const now = new Date();
        now.setUTCHours(0, 0, 0, 0)
	const table = await Table.findById(tableId).exec()
        if(givenDate.getDate() == now.getDate() && table.inLiveUse) {
            	continue;
		//return Httpresponse.BadRequest(res, "This table is in use at the time!")
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
            startDate.setDate(new Date(date).getDate() - 1);
            startDate.setUTCHours(18, 0, 0, 0);
            endDate.setDate(new Date(date).getDate());
            endDate.setUTCHours(12, 0, 0, 0);
        }

        // Searching for a conflicting data.
        const conflictingData = await Appointment.collection.findOne({
            RestaurantId: {
                $eq: req.user.restaurantId,
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
            	continue;
		//return Httpresponse.BadRequest(res, "Appointment found on the given date!")
        }

        // If everything went well, then we will generate a random pin, save the appointment and send an e-mail.
        const pinCode = createPin()
	console.log(pinCode)
        const appointment = new Appointment({
            RestaurantId: req.user.restaurantId,
            TableId: tableId,
            date: date,
	    email: email,
            peopleCount: peopleCount,
            code: pinCode
        })

        await appointment.save()
        await sendMail(email, 'Appointment booked', `<p>${pinCode}</p>`, res)

        return Httpresponse.Created(res, appointment)

	}

    }catch (e) {
	console.log(e)
        return Httpresponse.BadRequest(res, e)
    }

    return Httpresponse.NotFound(res, "No available tables found!") 

})



module.exports = router
