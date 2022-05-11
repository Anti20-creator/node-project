const excel            = require('excel4node')
const Appointments     = require('../models/AppointmentModel')
const LayoutController = require('../controller/layoutController')
const Layouts          = require('../models/LayoutModel')
const path             = require('path')
const fs               = require('fs')
const moment           = require('moment-timezone')

class DateError extends Error {
    constructor(message) {
        super(message)
        this.name = 'DateError'
    }
}
class TableNotFound extends Error {
    constructor(message) {
        super(message)
        this.name = 'TableNotFound'
    }
}
class TableSeatError extends Error {
    constructor(message) {
        super(message)
        this.name = 'TableSeatError'
    }
}

const findConflicts = async (restaurantId, tableId, startDate, endDate, returnType) => {
    const results = await Appointments.collection.find({
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

    if(returnType === 'length') {
        return results.length
    }else{
        const diffedValues = results.map(result => ({...result, diff: Math.abs(new Date() - result.date)}))
        diffedValues.sort((a, b) => a.diff > b.diff ? 1 : -1)
        return diffedValues.splice(0, 3)
    }
}

const checkDate = (date) => {
    const formattedDate = new Date(new Date(date) - 60_000 * new Date().getTimezoneOffset())
    const now = new Date()
    if(formattedDate.getTime() < now.getTime()) {
        throw new DateError("book-for-past")
    }
    if(formattedDate.getTime() > now.getTime() + 3_600_000 * 24 * 60) {
        throw new DateError("book-too-far")
    }

    return formattedDate
}

const checkTable = async(tableId, restaurantId, peopleCount) => {
    checkPeoplecount(peopleCount)

    if(tableId !== 'any') {
        const layout = await LayoutController.findById(restaurantId)
        const table = layout.tables.find(table => table.TableId === tableId)

        if(!table) {
            throw new TableNotFound()
        }

        if(table.tableCount < peopleCount) {
            throw new TableSeatError("too-many-people")
    	}
    }
}

const checkPeoplecount = (peopleCount) => {
    if(peopleCount < 1) {
        throw new TableSeatError("too-few-people")
    }
}

const createXLS = async (id) => {

    const now = new Date()
    const firstDayOfMonth = new Date(new Date(now.getFullYear(), now.getMonth(), 1).setUTCHours(0, 0, 0, 0))

    const layout = await Layouts.findOne({RestaurantId: id}).exec()
    const appointments = await Appointments.collection.find({
        RestaurantId: {
            $eq: id
        },
        date: {
            $lt: firstDayOfMonth
        },
        confirmed: {
            $eq: true
        }
    }).toArray()

    const workbook = new excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    worksheet.cell(1, 1).string('E-mail')
    worksheet.cell(1, 2).string('Date / Dátum')
    worksheet.cell(1, 3).string('Number of guests / Vendégek száma')
    let i = 2
    for(const appointment of appointments) {

        const localId = layout.tables.find(table => table.TableId === appointment.TableId)

        worksheet.cell(i, 1).string(appointment.email.toString())
        worksheet.cell(i, 2).string(moment.utc(appointment.date).format('L HH:mm'))
        worksheet.cell(i, 3).string(localId ? localId.localId.toString() : '-')
        worksheet.cell(i, 3).string(appointment.peopleCount.toString())

        i++
    }

    const buffer = await workbook.writeToBuffer();

    fs.writeFileSync(path.join(__dirname,'/..', '/public', '/xls', '/' + id + '.xlsx'), buffer, function(err) {
        if (err) {
            throw err
        }
    })
    await Appointments.collection.deleteMany({
        RestaurantId: {
            $eq: id
        },
        date: {
            $lt: firstDayOfMonth
        }
    })

}

module.exports = { findConflicts, createXLS, checkDate, checkTable, checkPeoplecount }
