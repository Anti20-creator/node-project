const mongoose = require('mongoose')

const InvoiceModel = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    RestaurantId: {
        type: String,
        required: true
    },
    invoiceName: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    }
})

const invoiceMongooseModel = mongoose.model('invoice', InvoiceModel)

invoiceMongooseModel.collection.createIndex( { email: 1, invoiceName: 1 }, { unique: true, sparse: false } )

module.exports = invoiceMongooseModel
