const crypto = require('crypto')

const createInvoiceName = (restaurantId) => {
    const invoiceId = crypto.randomBytes(10).toString('hex')
    const invoicePrefix = "Invoice - " + new Date().toISOString().split('T')[0] + "_" + invoiceId
    const invoiceName = invoicePrefix + "_" + restaurantId + ".pdf"

    return {invoiceId, invoicePrefix, invoiceName}
}

module.exports = { createInvoiceName }