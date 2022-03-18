const mongoose     = require('mongoose')
const express      = require('express')
const router       = express.Router()
const Httpresponse = require('../utils/ErrorCreator')
const Appointment  = require('../models/AppointmentModel')
const Table        = require('../models/TableModel')
const Layout       = require('../models/LayoutModel')
const Informations = require('../models/InformationsModel')

const {sendMail}   = require('../utils/EmailSender')
const { authenticateAccessToken } = require('../middlewares/auth')
const prcs = require('process');

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
        if(!date || !restaurantId || !tableId || !peopleCount || !email) {
            return Httpresponse.BadRequest(res, "Missing parameters!")
        }

        const infos = await Informations.findOne({RestaurantId: restaurantId})
	    const savedTime = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())

        // We create the date what the user sent us
        // We have to subtract the timezone offset because new Date() converts automatically to local timezone, not to UTC
        const givenDate = new Date(new Date(date).getTime() - new Date().getTimezoneOffset() * 60_000)
        
        const closeTimeOnGivenDay = infos.openingTimes[givenDate.getDay()]
        const closeTimeOnPastDay  = infos.openingTimes[(((givenDate.getDay() - 1) % 7) + 7) % 7]
        const closeTimeOnTomorrow = infos.openingTimes[(((givenDate.getDay() + 1) % 7) + 7) % 7]

        console.log(givenDate)
        console.log(Number(closeTimeOnPastDay.close.hours))
        console.log(givenDate.getUTCHours())
        console.log(Number(closeTimeOnPastDay.close.minutes))
        console.log(givenDate.getUTCMinutes())

        // We are checking if the appointment is on the given day's opening time
        // For example if we book for Saturday 01:00 A.M. and opening time on Friday is the following: 11:00-03:00 then we have to check for Friday's late appointments too

        if((Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.open.minutes) <= givenDate.getUTCMinutes())) &&
            (Number(closeTimeOnGivenDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.close.minutes) >= givenDate.getUTCMinutes())) ) {
            console.log('open on same day')


            const close = new Date("2000-01-01")
            close.setUTCHours(closeTimeOnGivenDay.close.hours, closeTimeOnGivenDay.close.minutes)

            const appointment = new Date("2000-01-01")
            appointment.setUTCHours(givenDate.getUTCHours(), givenDate.getUTCMinutes())

            console.log(close)
            console.log(appointment)

            if((close - appointment) / 60_000 < infos.timeBeforeLastAppointment && !(Number(closeTimeOnTomorrow.close.hours) % 24 === Number(closeTimeOnGivenDay.open.hours) % 24 &&
                closeTimeOnTomorrow.close.minutes === closeTimeOnGivenDay.open.minutes)) {
                console.log("too close to closing")
                return Httpresponse.BadRequest(res, "You are too close to closing time.")
            }
        }else if( (Number(closeTimeOnPastDay.open.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.open.minutes) >= givenDate.getUTCMinutes())) && 
            (Number(closeTimeOnPastDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.close.minutes) >= givenDate.getUTCMinutes())) && Number(closeTimeOnPastDay.close.hours) < Number(closeTimeOnPastDay.open.hours)) {
            console.log('open on day before')
        }else if( (Number(closeTimeOnGivenDay.open.hours) > Number(closeTimeOnGivenDay.close.hours) || (Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes > Number(closeTimeOnGivenDay.close.minutes))) ) && (Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours()  && Number(closeTimeOnGivenDay.open.minutes) < givenDate.getUTCMinutes() )) ) {
                console.log('open on long day')
        }else {
            console.log('Restarant is not open')
            return Httpresponse.BadRequest(res, "Restaurant is not open!")
        }

        // Set hours to null, for example 2022-03-09T00:00:00
        givenDate.setUTCHours(0, 0, 0, 0)
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0)


        const table = await Table.findById(tableId).exec()
        // If the table is in use then we are moving along
        if(givenDate.getTime() == now.getTime() && table.inLiveUse) {
            return Httpresponse.BadRequest(res, "Table is in live use!")  
        }

        // In normal case we set start date to 0:00 and end date next day 0:00, so we are searching in a 24h period
        let startDate = new Date(givenDate.getTime())
        startDate.setHours(0, 0, 0, 0);

        let endDate = new Date(givenDate.getTime())
        endDate.setUTCHours(0, 0, 0, 0);
        endDate.setDate(new Date(givenDate.getTime()).getDate() + 1);

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
            time: {
                $gt: startDate,
                $lt: endDate
            }
        })
        console.log(conflictingData)

        if(conflictingData) {
            return Httpresponse.BadRequest(res, "Appointment found on the given date!")
        }

        // If everything went well, then we will generate a random pin, save the appointment and send an e-mail.
        const pinCode = createPin()

        try {
            const appointment = new Appointment({
                RestaurantId: restaurantId,
                TableId: tableId,
                day: savedTime.toISOString().slice(0, 10),
                time: savedTime.toISOString(),
                peopleCount: peopleCount,
                code: pinCode,
                email: email
            })
            await appointment.save()
        }catch(e) {
            console.warn('Hiba a mentés során...')
            return Httpresponse.BadRequest(res, e.message)
        }


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
        day: date
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

        const {email, date, peopleCount, timezoneOffset} = req.body;

        // If parameters are missing then we should throw an error
        if(!date || !email || !peopleCount || !timezoneOffset) {
            return Httpresponse.BadRequest(res, "Missing parameters!")
        }

        const infos = await Informations.findOne({RestaurantId: req.user.restaurantId})
    	const savedTime = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())

        // We have to check that given table exists
        const layout = await Layout.findOne({
            RestaurantId: req.user.restaurantId
        }).exec()

        if(!layout) {
            return Httpresponse.BadRequest(res, "No table found with given parameters!")
        }

	    const tables = layout.tables.filter(table => table.tableCount >= peopleCount).map(table => table.TableId)

	for (const tableId of tables) {

        // We create the date what the user sent us
        // We have to subtract the timezone offset because new Date() converts automatically to local timezone, not to UTC
        const givenDate = new Date(new Date(date).getTime() - new Date().getTimezoneOffset() * 60_000)
        
        const closeTimeOnGivenDay = infos.openingTimes[givenDate.getDay()]
        const closeTimeOnPastDay  = infos.openingTimes[(((givenDate.getDay() - 1) % 7) + 7) % 7]
        const closeTimeOnTomorrow = infos.openingTimes[(((givenDate.getDay() + 1) % 7) + 7) % 7]

        console.log(givenDate)
        console.log(Number(closeTimeOnPastDay.close.hours))
        console.log(givenDate.getUTCHours())
        console.log(Number(closeTimeOnPastDay.close.minutes))
        console.log(givenDate.getUTCMinutes())

        // We are checking if the appointment is on the given day's opening time
        // For example if we book for Saturday 01:00 A.M. and opening time on Friday is the following: 11:00-03:00 then we have to check for Friday's late appointments too

        if((Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.open.minutes) <= givenDate.getUTCMinutes())) &&
            (Number(closeTimeOnGivenDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.close.minutes) >= givenDate.getUTCMinutes())) ) {
            console.log('open on same day')


            const close = new Date("2000-01-01")
            close.setUTCHours(closeTimeOnGivenDay.close.hours, closeTimeOnGivenDay.close.minutes)

            const appointment = new Date("2000-01-01")
            appointment.setUTCHours(givenDate.getUTCHours(), givenDate.getUTCMinutes())

            console.log(close)
            console.log(appointment)

            if((close - appointment) / 60_000 < infos.timeBeforeLastAppointment && !(Number(closeTimeOnTomorrow.close.hours) % 24 === Number(closeTimeOnGivenDay.open.hours) % 24 &&
                closeTimeOnTomorrow.close.minutes === closeTimeOnGivenDay.open.minutes)) {
                console.log("too close to closing")
                return Httpresponse.BadRequest(res, "You are too close to closing time.")
            }
        }else if( (Number(closeTimeOnPastDay.open.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.open.minutes) >= givenDate.getUTCMinutes())) && 
            (Number(closeTimeOnPastDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.close.minutes) >= givenDate.getUTCMinutes())) && Number(closeTimeOnPastDay.close.hours) < Number(closeTimeOnPastDay.open.hours)) {
            console.log('open on day before')
        }else if( (Number(closeTimeOnGivenDay.open.hours) > Number(closeTimeOnGivenDay.close.hours) || (Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes > Number(closeTimeOnGivenDay.close.minutes))) ) && (Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours()  && Number(closeTimeOnGivenDay.open.minutes) < givenDate.getUTCMinutes() )) ) {
                console.log('open on long day')
        }else{
            console.log('Restarant is not open')
            return Httpresponse.BadRequest(res, "Restaurant is not open!")
        }

        // Set hours to null, for example 2022-03-09T00:00:00
        givenDate.setUTCHours(0, 0, 0, 0)
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0)


	    const table = await Table.findById(tableId).exec()
        // If the table is in use then we are moving along
        if(givenDate.getTime() == now.getTime() && table.inLiveUse) {
            continue;  
        }

        // In normal case we set start date to 0:00 and end date next day 0:00, so we are searching in a 24h period
        let startDate = new Date(givenDate.getTime())
        startDate.setHours(0, 0, 0, 0);

        let endDate = new Date(givenDate.getTime())
        endDate.setUTCHours(0, 0, 0, 0);
        endDate.setDate(new Date(givenDate.getTime()).getDate() + 1);

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
            time: {
                $gt: startDate,
                $lt: endDate
            }
        })
	    console.log(conflictingData)

        if(conflictingData) {
            	continue;
        }

        // If everything went well, then we will generate a random pin, save the appointment and send an e-mail.
        const pinCode = createPin()
   try {
	        const appointment = new Appointment({
	            RestaurantId: req.user.restaurantId,
	            TableId: tableId,
	            day: savedTime.toISOString().slice(0, 10),
	            time: savedTime.toISOString(),
	            email: email,
	            peopleCount: peopleCount,
	            code: pinCode
	        })

	        await appointment.save()
	        await sendMail(email, 'Appointment booked', `<p>${pinCode}</p>`, res)

            console.log('IDŐPONT MENTVE')
        	return Httpresponse.Created(res, appointment)
	}catch(e) {
		console.log(e.message)
	}

	}

    }catch (e) {
	console.log(e)
        return Httpresponse.BadRequest(res, e)
    }

    return Httpresponse.NotFound(res, "No available tables found!") 

})

router.post('/search-tables', async(req, res) => {

    let resultTables = []
    console.log('Searching tables')

    try {

        const {email, date, peopleCount, restaurantId} = req.body;

        // If parameters are missing then we should throw an error
        if(!date || !email || !peopleCount || !restaurantId) {
            return Httpresponse.BadRequest(res, "Missing parameters!")
        }

        const infos = await Informations.findOne({RestaurantId: restaurantId})

        // We have to check that given table exists
        const layout = await Layout.findOne({
            RestaurantId: restaurantId
        }).exec()

        if(!layout) {
            return Httpresponse.BadRequest(res, "No table found with given parameters!")
        }

        const tables = layout.tables.filter(table => table.tableCount >= Number(peopleCount)).map(table => table.TableId)

        for (const tableId of tables) {

            // We create the date what the user sent us
            // We have to subtract the timezone offset because new Date() converts automatically to local timezone, not to UTC
            const givenDate = new Date(new Date(date).getTime() - new Date().getTimezoneOffset() * 60_000)
            
            const closeTimeOnGivenDay = infos.openingTimes[givenDate.getDay()]
            const closeTimeOnPastDay  = infos.openingTimes[(((givenDate.getDay() - 1) % 7) + 7) % 7]
            const closeTimeOnTomorrow = infos.openingTimes[(((givenDate.getDay() + 1) % 7) + 7) % 7]

            console.log(givenDate)
            console.log(Number(closeTimeOnGivenDay.open.hours))
            console.log(givenDate.getUTCHours())
            console.log(Number(closeTimeOnGivenDay.open.minutes))
            console.log(givenDate.getUTCMinutes())
            console.log(Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours())
            console.log(Number(closeTimeOnGivenDay.close.hours), givenDate.getUTCHours())

            // We are checking if the appointment is on the given day's opening time
            // For example if we book for Saturday 01:00 A.M. and opening time on Friday is the following: 11:00-03:00 then we have to check for Friday's late appointments too

            if( (Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.open.minutes) <= givenDate.getUTCMinutes()) ) &&
                (Number(closeTimeOnGivenDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnGivenDay.close.minutes) >= givenDate.getUTCMinutes())) ) {
                console.log('open on same day')


                const close = new Date("2000-01-01")
                close.setUTCHours(closeTimeOnGivenDay.close.hours, closeTimeOnGivenDay.close.minutes)

                const appointment = new Date("2000-01-01")
                appointment.setUTCHours(givenDate.getUTCHours(), givenDate.getUTCMinutes())

                console.log(close)
                console.log(appointment)

                if((close - appointment) / 60_000 < infos.timeBeforeLastAppointment && !(Number(closeTimeOnTomorrow.close.hours) % 24 === Number(closeTimeOnGivenDay.open.hours) % 24 &&
                    closeTimeOnTomorrow.close.minutes === closeTimeOnGivenDay.open.minutes)) {
                    console.log("too close to closing")
                    return Httpresponse.BadRequest(res, "You are too close to closing time.")
                }
            }else if( (Number(closeTimeOnPastDay.open.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.open.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.open.minutes) >= givenDate.getUTCMinutes())) && 
                (Number(closeTimeOnPastDay.close.hours) > givenDate.getUTCHours() || (Number(closeTimeOnPastDay.close.hours) === givenDate.getUTCHours() && Number(closeTimeOnPastDay.close.minutes) >= givenDate.getUTCMinutes())) && Number(closeTimeOnPastDay.close.hours) < Number(closeTimeOnPastDay.open.hours)) {
                console.log('open on day before')
            }else if( (Number(closeTimeOnGivenDay.open.hours) > Number(closeTimeOnGivenDay.close.hours) || (Number(closeTimeOnGivenDay.open.hours) === Number(closeTimeOnGivenDay.close.hours) && Number(closeTimeOnGivenDay.open.minutes > Number(closeTimeOnGivenDay.close.minutes))) ) && (Number(closeTimeOnGivenDay.open.hours) < givenDate.getUTCHours() || (Number(closeTimeOnGivenDay.open.hours) === givenDate.getUTCHours()  && Number(closeTimeOnGivenDay.open.minutes) < givenDate.getUTCMinutes() )) ) {
                console.log('open on long day')
            }else {
                console.log('Restarant is not open')
                return Httpresponse.BadRequest(res, "Restaurant is not open!")
            }

            // Set hours to null, for example 2022-03-09T00:00:00
            givenDate.setUTCHours(0, 0, 0, 0)
            const now = new Date();
            now.setUTCHours(0, 0, 0, 0)


            const table = await Table.findById(tableId).exec()
            // If the table is in use then we are moving along
            if(givenDate.getTime() == now.getTime() && table.inLiveUse) {
                continue;  
            }

            // In normal case we set start date to 0:00 and end date next day 0:00, so we are searching in a 24h period
            let startDate = new Date(givenDate.getTime())
            startDate.setHours(0, 0, 0, 0);

            let endDate = new Date(givenDate.getTime())
            endDate.setUTCHours(0, 0, 0, 0);
            endDate.setDate(new Date(givenDate.getTime()).getDate() + 1);

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
                time: {
                    $gt: startDate,
                    $lt: endDate
                }
            })
            console.log(conflictingData)

            if(conflictingData) {
                    continue;
            }

            resultTables.push(tableId)
    }

    }catch (e) {
        console.log(e)
        return Httpresponse.BadRequest(res, e)
    }

    return Httpresponse.OK(res, resultTables) 

})



module.exports = router
