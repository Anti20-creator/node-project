const excel        = require('excel4node')
const Appointments = require('../models/AppointmentModel')
const Layouts      = require('../models/LayoutModel')
const path         = require('path')
const fs           = require('fs')
const mongoose     = require('mongoose')

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

const createXLS = async (id) => {

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    console.log(id)
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
            console.err(err)
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

module.exports = { findConflicts, createXLS }