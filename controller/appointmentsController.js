const excel            = require('excel4node')
const Appointments     = require('../models/AppointmentModel')
const LayoutController = require('../controller/layoutController')
const Layouts          = require('../models/LayoutModel')
const path             = require('path')
const fs               = require('fs')

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
        return results
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
    console.warn(tableId)
    if(tableId !== 'any') {
        const layout = await LayoutController.findById(restaurantId)
        const table = layout.tables.find(table => table.TableId === tableId)

        if(!table) {
            throw new TableNotFound()
        }

        if(table.tableCount < peopleCount) {
            throw new TableSeatError()
    	}
    }
}

const createXLS = async (id) => {

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const layout = await Layouts.findOne({RestaurantId: id}).exec()
    const appointments = await Appointments.collection.find({
        RestaurantId: {
            $eq: id
        },
        /*date: {
            $lt: firstDayOfMonth
        }*/
    }).toArray()

    const workbook = new excel.Workbook()
    const worksheet = workbook.addWorksheet('Sheet 1')

    let i = 2
    for(const appointment of appointments) {

        const localId = layout.tables.find(table => table.TableId === appointment.TableId)

        worksheet.cell(i, 1).string(appointment.email.toString())
        worksheet.cell(i, 2).string(appointment.date.toString())
        worksheet.cell(i, 3).string(localId ? localId.localId.toString() : '')
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
        /*date: {
            $lt: firstDayOfMonth
        }*/
    })

}

module.exports = { findConflicts, createXLS, checkDate, checkTable }
