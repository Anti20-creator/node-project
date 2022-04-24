const express                     = require('express')
const router                      = express.Router()
const Httpresponse                = require('../utils/ErrorCreator')
const Appointments                = require('../models/AppointmentModel')
const AppointmentsController      = require('../controller/appointmentsController')
const TableController             = require('../controller/tableController')
const LayoutController            = require('../controller/layoutController')
const InformationsController      = require('../controller/informationsController')
const RequestValidator            = require('../controller/bodychecker')
const { authenticateAccessToken } = require('../middlewares/auth')
const { catchErrors }             = require('../utils/ErrorHandler')
const { sendBookedAppointmentEmail, sendDeletedAppointmentEmail, sendUpdatedAppointmentEmail } = require('../utils/EmailSender')

function createPin() {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let pin = ''
    for (let i = 0; i < parseInt(process.env.APPOINTMENT_PIN_LENGTH); i++) {
        pin += chars[Math.floor(Math.random() * chars.length)]
    }
    return pin
}

function checkRestaurantOpen(infos, givenDate) {
    const closeTimeOnGivenDay  = infos.openingTimes[(((givenDate.getUTCDay() - 1) % 7) + 7) % 7]
    const closeTimeOnPastDay  = infos.openingTimes[(((givenDate.getUTCDay() - 2) % 7) + 7) % 7]

    if((Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.open.minutes) <= givenDate.getUTCMinutes())) &&
            (Number(closeTimeOnGivenDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.close.minutes) >= givenDate.getUTCMinutes())) && !((Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes) === Number(closeTimeOnGivenDay.close.minutes)) && Number(closeTimeOnGivenDay.open.hours) === 0) ) {
        //open on same day
        return true
    }else if( (Number(closeTimeOnPastDay.open.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.open.minutes) >= givenDate.getUTCMinutes())) && 
        (Number(closeTimeOnPastDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.close.minutes) >= givenDate.getUTCMinutes())) && Number(closeTimeOnPastDay.close.hours) < Number(closeTimeOnPastDay.open.hours)) {
        //open on day before
        return true
    }else if( (Number(closeTimeOnGivenDay.open.hours) > Number(closeTimeOnGivenDay.close.hours) || (Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes > Number(closeTimeOnGivenDay.close.minutes))) ) && (Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours()  && Number(closeTimeOnGivenDay.open.minutes) < givenDate.getUTCMinutes() )) ) {
        //open on long day for example: 02:00-05:00
        return true
    }else{
        // Restaurant is not open
        return false
    }
}

router.post('/book', catchErrors(async(req, res) => {

    const { email, date, restaurantId, tableId, peopleCount, lang } = RequestValidator.destructureBody(req, res, {email: 'string', date: 'string', restaurantId: 'string', tableId: 'string', peopleCount: 'number', lang: 'string'})

    const formattedDate = AppointmentsController.checkDate(date)
    await AppointmentsController.checkTable(tableId, restaurantId, peopleCount)

    const informations = await InformationsController.findById(restaurantId)
    if(!checkRestaurantOpen(informations, formattedDate)) {
        return Httpresponse.BadRequest(res, "restaurant-closed")
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

    sendBookedAppointmentEmail(email, {date: formattedDate, peopleCount, code: pinCode, accepted: false, _id: appointment._id}, lang)

    return Httpresponse.Created(res, appointment)
}))

router.post('/booking-conflicts', authenticateAccessToken, catchErrors(async(req, res) => {

    const { date, tableId, peopleCount } = RequestValidator.destructureBody(req, res, {date: 'string', tableId: 'string', peopleCount: 'number'})
    
    const startDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() - 3_600_000 * 12)
    const endDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset() + 3_600_000 * 12)

    await AppointmentsController.checkTable(tableId, req.user.restaurantId, peopleCount)
    const optionalConflicts = await AppointmentsController.findConflicts(req.user.restaurantId, tableId, startDate, endDate)

    return Httpresponse.OK(res, optionalConflicts)
}))

router.post('/search-tables', catchErrors(async(req, res) => {

    const { date, peopleCount, restaurantId } = RequestValidator.destructureBody(req, res, {date: 'string', peopleCount: 'number', restaurantId: 'string'})
    
    AppointmentsController.checkPeoplecount(peopleCount)
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

    const {accept, appointmentId, tableId, lang} = req.body

    if(accept === undefined || !appointmentId) {
        return Httpresponse.BadRequest("appointments-missing-parameters")
    }

    const appointment = await Appointments.findById(appointmentId)
    const email = appointment.email.slice()
    if(accept) {
        appointment.confirmed = true; appointment.TableId = tableId
        await appointment.save()
    }else{
        appointment.deleteOne()
    }

    sendUpdatedAppointmentEmail(email, accept, lang)
    return Httpresponse.OK(res, "appointment-updated")
}))

router.delete('/disclaim', catchErrors(async(req, res) => {

    const { id, restaurantId, email, pin, lang } = RequestValidator.destructureBody(req, res, {id: 'string', email: 'string', restaurantId: 'string', pin: 'string', lang: 'string'})

    //Finding the appointment
    const appointment = await Appointments.findOne({
        RestaurantId: restaurantId,
        _id: id,
        email: email
    }).exec()

    if(!appointment) {
        return Httpresponse.NotFound(res, "appointment-not-found");
    }

    if(appointment.code !== pin) {
        return Httpresponse.BadRequest(res, "bad-appointment-pin")
    }

    await appointment.deleteOne();
    sendDeletedAppointmentEmail(email, lang)
    return Httpresponse.OK(res, "appointment-deleted")
}))

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {

    const appointments = await Appointments.find({ RestaurantId: req.user.restaurantId }).exec()

    return Httpresponse.OK(res, appointments)
}))

router.delete('/delete-appointment/:id', authenticateAccessToken, catchErrors(async(req, res) => {

    const { lang } = RequestValidator.destructureBody(req, res, {lang: 'string'})
    const appointment = await Appointments.findById(req.params.id).exec()
    const email = appointment.email

    await appointment.delete()
    sendDeletedAppointmentEmail(email, lang)

    return Httpresponse.OK(res, "appointment-deleted")
}))

router.post('/book-for-guest', authenticateAccessToken, catchErrors(async(req, res) => {

    const { email, date, tableId, peopleCount, lang } = RequestValidator.destructureBody(req, res, {email: 'string', date: 'string', tableId: 'string', peopleCount: 'number', lang: 'string'})

    const formattedDate = AppointmentsController.checkDate(date)
    await AppointmentsController.checkTable(tableId, req.user.restaurantId, peopleCount)

    const informations = await InformationsController.findById(req.user.restaurantId)
    if(!checkRestaurantOpen(informations, formattedDate)) {
        return Httpresponse.BadRequest(res, "restaurant-closed")
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

    sendBookedAppointmentEmail(email, {date: formattedDate, peopleCount, code: pinCode, accepted: true, _id: appointment._id}, lang)

    return Httpresponse.Created(res, appointment)
}))

router.post('/is-open', catchErrors(async(req, res) => {

    const {date, restaurantId} = RequestValidator.destructureBody(req, res, {date: 'string', restaurantId: 'string'})

    const formattedDate = checkDate(date)

    const informations = await InformationsController.findById(restaurantId)
    return Httpresponse.OK(res, checkRestaurantOpen(informations, formattedDate))
}))

module.exports = router
