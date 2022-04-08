const express                     = require('express')
const router                      = express.Router()
const Httpresponse                = require('../utils/ErrorCreator')
const Appointments                = require('../models/AppointmentModel')
const AppointmentsController      = require('../controller/appointmentsController')
const TableController             = require('../controller/tableController')
const LayoutController            = require('../controller/layoutController')
const InformationsController      = require('../controller/informationsController')
const RequestValidator            = require('../controller/bodychecker')
const {sendMail, sendBookedAppointmentEmail}                  = require('../utils/EmailSender')
const { authenticateAccessToken } = require('../middlewares/auth')
const { catchErrors }             = require('../utils/ErrorHandler')

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
                if((Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes) === Number(closeTimeOnGivenDay.close.minutes)) && Number(closeTimeOnGivenDay.open.hours) === 0) {
                    return false
                }
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
        console.log('Restaurant is not open')
        return false
    }
}

router.post('/book', catchErrors(async(req, res) => {

    console.warn(req.body)
    const { email, date, restaurantId, tableId, peopleCount } = RequestValidator.destructureBody(req, res, {email: 'string', date: 'string', restaurantId: 'string', tableId: 'string', peopleCount: 'number'})

    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    const now = new Date()
    if(formattedDate.getTime() < now.getTime()) {
        return Httpresponse.BadRequest(res, "You can't book for the past!")
    }
    if(formattedDate.getTime() > now.getTime() + 3_600_000 * 24 * 60) {
        return Httpresponse.BadRequest(res, "You can't book more than 60 days ahead!")
    }

    if(tableId !== 'any') {
        const layout = await LayoutController.findById(restaurantId)
        const table = layout.tables.find(table => table.TableId === tableId)
        if(!table) {
            return Httpresponse.NotFound(res, "No table found!")
        }

        if(table.tableCount < peopleCount) {
            return Httpresponse.BadRequest(res, "Not enough seats!")
    	}
    }

    const informations = await InformationsController.findById(restaurantId)
    if(!checkRestaurantOpen(informations, formattedDate)) {
        return Httpresponse.BadRequest(res, "Restaurant is closed!")
    }

    const pinCode = createPin()
    const appointment = new Appointments({
        RestaurantId: restaurantId,
        TableId: tableId,
        date: formattedDate,
        peopleCount: peopleCount,
        code: pinCode,
        email: email,
        confirmed: false
    })
    await appointment.save()

    sendMail(email, 'Appointment booked', `<p>${pinCode}</p>`, res)

    return Httpresponse.Created(res, appointment)
}))

router.post('/booking-conflicts', authenticateAccessToken, catchErrors(async(req, res) => {

    const { date, tableId, peopleCount } = RequestValidator.destructureBody(req, res, {date: 'string', tableId: 'string', peopleCount: 'number'})
    const startDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() - 3_600_000 * 12)
    const endDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() + 3_600_000 * 12)

    const table = await TableController.findById(tableId)
    if(table.tableCount < peopleCount) {
	return Httpresponse.BadRequest(res, "Not enough seats!")
    }
    const optionalConflicts = await AppointmentsController.findConflicts(req.user.restaurantId, tableId, startDate, endDate)

    return Httpresponse.OK(res, optionalConflicts)
}))

router.post('/search-tables', catchErrors(async(req, res) => {

    const { date, peopleCount, restaurantId } = RequestValidator.destructureBody(req, res, {date: 'string', peopleCount: 'number', restaurantId: 'string'})
    const startDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() - 3_600_000 * 12)
    const endDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() + 3_600_000 * 12)

    const tables = await TableController.getAll(restaurantId)
    const layout = await LayoutController.findById(restaurantId)
    const resultIds = []

    for (const table of tables) {
	    const optionalConflictsLength = await AppointmentsController.findConflicts(restaurantId, table._id, startDate, endDate, 'length')
        
        if(optionalConflictsLength === 0 && layout.tables.find(t => t.TableId === table._id.toString()).tableCount >= peopleCount) {
		    resultIds.push(table._id)
	    }
    }

    return Httpresponse.OK(res, resultIds)
}))

router.put('/accept-appointment', authenticateAccessToken, catchErrors(async(req, res) => {

    const {accept, appointmentId, tableId} = req.body

    if(accept === undefined || !appointmentId) {
        return Httpresponse.OK("Missing parameters!")
    }

    if(accept) {
        await Appointments.findByIdAndUpdate(appointmentId, {
            confirmed: true,
            TableId: tableId
        })
    }else{
        await Appointments.findByIdAndDelete(appointmentId)
    }

    return Httpresponse.OK(res, "Appointment status has been updated.")
}))

router.delete('/disclaim', catchErrors(async(req, res) => {
    const { date, tableId, restaurantId, pin } = RequestValidator.destructureBody(req, res, {date: 'string', tableId: 'string', restaurantId: 'string', pin: 'string'})

    // Finding the appointment
    const appointment = await Appointments.findOne({
        RestaurantId: restaurantId,
        TableId: tableId,
        date: date,
    })

    if(!appointment) {
        return Httpresponse.NotFound(res, "No data exist with given parameters!");
    }

    if(appointment.code !== pin) {
        return Httpresponse.BadRequest(res, "The entered PIN is incorrect!")
    }

    await appointment.deleteOne();
    return Httpresponse.OK(res, "Your appointment has been deleted!")
}))

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {

    const appointments = await Appointments.find({ RestaurantId: req.user.restaurantId }).exec()

    return Httpresponse.OK(res, appointments)
}))

router.delete('/delete-appointment/:id', authenticateAccessToken, catchErrors(async(req, res) => {

    const appointment = await Appointments.findById(req.params.id).exec()

    const email = appointment.email

    await appointment.delete()
    sendMail(email, 'Appointment cancelled', 'A rendelése törlésre került!', res)

    return Httpresponse.OK(res, "Appointment deleted!")
}))

router.post('/book-for-guest', authenticateAccessToken, catchErrors(async(req, res) => {

    const { email, date, tableId, peopleCount } = RequestValidator.destructureBody(req, res, {email: 'string', date: 'string', tableId: 'string', peopleCount: 'number'})

    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    if(formattedDate.getTime() < new Date().getTime()) {
        return Httpresponse.BadRequest(res, "You can't book for the past!")
    }

    // Check if given table exists
    if(tableId !== 'any') {
        const layout = await LayoutController.findById(req.user.restaurantId)
        const table = layout.tables.find(table => table.TableId === tableId)
        if(!table) {
            return Httpresponse.NotFound(res, "No table found!")
        }

        if(table.tableCount < peopleCount) {
            return Httpresponse.BadRequest(res, "Not enough seats!")
    	}
    }

    const informations = await InformationsController.findById(req.user.restaurantId)
    if(!checkRestaurantOpen(informations, formattedDate)) {
        return Httpresponse.BadRequest(res, "Restaurant is closed!")
    }

    const pinCode = createPin()
    const appointment = new Appointments({
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
    sendBookedAppointmentEmail(email, {date: formattedDate, peopleCount, code: pinCode})

    return Httpresponse.Created(res, appointment)
}))

router.post('/is-open', catchErrors(async(req, res) => {

    const {date, restaurantId} = RequestValidator.destructureBody(req, res, {date: 'string', restaurantId: 'string'})

    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    if(formattedDate.getTime() < new Date().getTime()) {
        return Httpresponse.BadRequest(res, "You can't book for the past!")
    }

    const informations = await InformationsController.findByAuth(restaurantId)
    if(!checkRestaurantOpen(informations, formattedDate)) {
        return Httpresponse.BadRequest(res, "Restaurant is closed!")
    }else{
	    return Httpresponse.OK(res, "Restaurant is open!")
    }
}))

module.exports = router
