const express      = require('express')
const router       = express.Router()
const Httpresponse = require('../utils/ErrorCreator')
const Appointment  = require('../models/AppointmentModel')
const Table        = require('../models/TableModel')
const Layout       = require('../models/LayoutModel')
const Informations = require('../models/InformationsModel')
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

function checkRestaurantOpen(infos, givenDate) {
    const closeTimeOnGivenDay = infos.openingTimes[givenDate.getDay()]
    const closeTimeOnPastDay  = infos.openingTimes[(((givenDate.getDay() - 1) % 7) + 7) % 7]

    if((Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.open.minutes) <= givenDate.getUTCMinutes())) &&
            (Number(closeTimeOnGivenDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.close.minutes) >= givenDate.getUTCMinutes())) ) {
            console.log('open on same day')
            return true
    }else if( (Number(closeTimeOnPastDay.open.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.open.minutes) >= givenDate.getUTCMinutes())) && 
        (Number(closeTimeOnPastDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.close.minutes) >= givenDate.getUTCMinutes())) && Number(closeTimeOnPastDay.close.hours) < Number(closeTimeOnPastDay.open.hours)) {
        console.log('open on day before')
        return true
    }else if( (Number(closeTimeOnGivenDay.open.hours) > Number(closeTimeOnGivenDay.close.hours) || (Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes > Number(closeTimeOnGivenDay.close.minutes))) ) && (Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours()  && Number(closeTimeOnGivenDay.open.minutes) < givenDate.getUTCMinutes() )) ) {
        console.log('open on long day')
        return true
    }else{
        console.log('Restarant is not open')
        return false
    }
}

router.post('/book', async(req, res) => {

    const { email, date, restaurantId, tableId, peopleCount } = req.body

    if(!email || !date || !restaurantId || !tableId || !peopleCount) {
        return Httpresponse.BadRequest(res, "Missing parameters!")
    }

    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    if(formattedDate.getTime() < new Date().getTime()) {
        return Httpresponse.BadRequest(res, "You can't book for the past!")
    }

    // Check if given table exists
    if(tableId !== 'any') {
        const table = await Table.findOne({ RestaurantId: restaurantId, _id: tableId }).exec()
        if(!table) {
            return Httpresponse.NotFound(res, "Given table not found!")
        }

	if(table.tableCount < peopleCount) {
	    return Httpresponse.BadRequest(res, "Not enough seats!")
	}
    }

    console.time()
    const informations = await Informations.findOne({ RestaurantId: restaurantId }).exec()
    console.timeEnd()
    const isOpen = checkRestaurantOpen(informations, formattedDate)
    if(!isOpen) {
        return Httpresponse.BadRequest(res, "Restaurant is closed!")
    }

    const pinCode = createPin()
    const appointment = new Appointment({
        RestaurantId: restaurantId,
        TableId: tableId,
        date: formattedDate,
        peopleCount: peopleCount,
        code: pinCode,
        email: email,
        confirmed: false
    })
    await appointment.save()

    //await removed
    sendMail(email, 'Appointment booked', `<p>${pinCode}</p>`, res)

    return Httpresponse.Created(res, appointment)

})

router.post('/booking-conflicts', authenticateAccessToken, async(req, res) => {

    const { date, tableId, peopleCount } = req.body
    const startDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() - 3_600_000 * 12)
    const endDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() + 3_600_000 * 12)

    const table = await Table.findById(tableId).exec()
    if(!table) {
	return Httpresponse.NotFound(res, "No table found!")
    }
    if(table.tableCount < peopleCount) {
	return Httpresponse.BadRequest(res, "Not enough seats!")
    }

    const optionalConflicts = await Appointment.collection.find({
        RestaurantId: {
            $eq: req.user.restaurantId,
        },
        TableId: {
            $eq: tableId
        },
        date: {
            $gt: startDate,
            $lt: endDate
        },
	confirmed: {
	    $eq: true
	}
    }).toArray()

    return Httpresponse.OK(res, optionalConflicts)
})

router.post('/search-tables', async(req, res) => {

    const { date, peopleCount, restaurantId } = req.body
    const startDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() - 3_600_000 * 12)
    const endDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() + 3_600_000 * 12)

    const tables = await Table.find({RestaurantId: restaurantId}).exec()
    const resultIds = []

    for (const table of tables) {
	    const tableId = table._id
	    const optionalConflicts = await Appointment.collection.find({
	        RestaurantId: {
	            $eq: restaurantId,
	        },
	        TableId: {
	            $eq: tableId
	        },
	        date: {
	            $gt: startDate,
	            $lt: endDate
	        },
		confirmed: {
		    $eq: true
		}
	    }).toArray()
            if(optionalConflicts.length === 0) {
		resultIds.push(tableId)
	    }

    }

    return Httpresponse.OK(res, resultIds)

})

router.put('/accept-appointment', authenticateAccessToken, async(req, res) => {

    const {accept, appointmentId, tableId} = req.body

    if(accept === undefined || !appointmentId) {
        return Httpresponse.OK("Missing parameters!")
    }

    console.log('ACCEPT:', tableId)

    if(accept) {
        await Appointment.findByIdAndUpdate(appointmentId, {
            confirmed: true,
            TableId: tableId
        })
    }else{
        await Appointment.findByIdAndDelete(appointmentId)
    }

    return Httpresponse.OK(res, "Appointment status has been updated.")

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

    console.log(req.user.restaurantId)
    const appointments = await Appointment.find({ RestaurantId: req.user.restaurantId }).exec()

    return Httpresponse.OK(res, appointments)

})

router.delete('/delete-appointment/:id', authenticateAccessToken, async(req, res) => {

    const appointment = await Appointment.findById(req.params.id).exec()

    console.log(appointment)
    const email = appointment.email
    console.log(email)

    await appointment.delete()
    sendMail(email, 'Appointment cancelled', 'A rendelése törlésre került!', res)

    return Httpresponse.OK(res, "Appointment deleted!")
})

router.post('/book-for-guest', authenticateAccessToken, async(req, res) => {

    const { email, date, tableId, peopleCount } = req.body

    if(!email || !date || !tableId || !peopleCount) {
        return Httpresponse.BadRequest(res, "Missing parameters!")
    }

    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    if(formattedDate.getTime() < new Date().getTime()) {
        return Httpresponse.BadRequest(res, "You can't book for the past!")
    }

    // Check if given table exists
    if(tableId !== 'any') {
        const table = await Table.findOne({ RestaurantId: req.user.restaurantId, _id: tableId }).exec()
        if(!table) {
            return Httpresponse.NotFound(res, "Given table not found!")
        }

	if(table.tableCount < peopleCount) {
	    return Httpresponse.BadRequest(res, "Not enough seats!")
	}
    }

    console.time()
    const informations = await Informations.findOne({ RestaurantId: req.user.restaurantId }).exec()
    console.timeEnd()
    const isOpen = checkRestaurantOpen(informations, formattedDate)
    if(!isOpen) {
        return Httpresponse.BadRequest(res, "Restaurant is closed!")
    }

    const pinCode = createPin()
    const appointment = new Appointment({
        RestaurantId: req.user.restaurantId,
        TableId: tableId,
        date: formattedDate,
        peopleCount: peopleCount,
        code: pinCode,
        email: email,
        confirmed: true
    })
    await appointment.save()

    //await removed
    sendMail(email, 'Appointment booked', `<p>${pinCode}</p>`, res)

    return Httpresponse.Created(res, appointment)

})

router.post('/is-open', async(req, res) => {

    const {date, restaurantId} = req.body

    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    if(formattedDate.getTime() < new Date().getTime()) {
        return Httpresponse.BadRequest(res, "You can't book for the past!")
    }

    const informations = await Informations.findOne({ RestaurantId: restaurantId }).exec()
    const isOpen = checkRestaurantOpen(informations, formattedDate)
    if(!isOpen) {
        return Httpresponse.BadRequest(res, "Restaurant is closed!")
    }else{
	return Httpresponse.OK(res, "Restaurant is open!")
    }

})


module.exports = router
