const Invoices     = require('../models/InvoiceModel')
const Zip          = require('adm-zip')
const { sendMail } = require('../utils/EmailSender')
const fs           = require('fs')
const Restaurant   = require('../models/RestaurantModel')
const AppointmentController   = require('./appointmentsController')

const findAllInvoiceToRestaurant = async (id) => {
    const invoices = await Invoices.find({RestaurantId: id}).exec()
    return invoices
}

const exportToZip = async(id) => {
    const now = new Date()
    const firstDayOfMonth = new Date(new Date(now.getFullYear(), now.getMonth(), 1).setUTCHours(0, 0, 0, 0))

    let invoices = await findAllInvoiceToRestaurant(id)
    invoices = invoices.filter(invoice => invoice._id.getTimestamp() < firstDayOfMonth)

    await AppointmentController.createXLS(id)

    const zip = new Zip()
    for(const invoice of invoices) {
        zip.addLocalFile(__dirname + '/../public/invoices/' + invoice.invoiceName)
    }
    zip.addLocalFile(__dirname + '/../public/xls/' + id + '.xlsx')
    zip.writeZip(__dirname + '/../public/invoice_zips/' + id + '.zip')

    if(fs.existsSync(__dirname + '/../public/invoice_zips/' + id + '.zip')) {
        await Invoices.deleteMany({RestaurantId: id}).exec()
    }

    return id
}

const sendExportedInMail = async(id, email) => {
    const zipName = await exportToZip(id)

    sendMail(email, "Report / Riport", "", zipName)
}

const sendReports = async() => {
    const restaurants = await Restaurant.find({}, '_id ownerEmail').exec()
    for(const restaurant of restaurants) {
        await sendExportedInMail(restaurant._id.toString(), restaurant.ownerEmail)
    }
}

module.exports = { findAllInvoiceToRestaurant, exportToZip, sendExportedInMail, sendReports }