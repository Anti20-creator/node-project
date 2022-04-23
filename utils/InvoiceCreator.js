const PDFDocument     = require("pdfkit");
const path            = require("path");
const fs              = require("fs");
const Informations    = require('../models/InformationsModel')
const Restaurant      = require('../models/RestaurantModel')
const Invoice         = require('../models/InvoiceModel')
const translations    = require('./InvoiceTranslations')
const { getCurrency } = require('./CurrencySelector')

async function createInvoice(invoice, path, invoiceId, restaurantId, email, language, callback) {

    let doc = new PDFDocument({ size: "A4", margin: 50 });
    
    const restaurant = await Restaurant.findById(restaurantId).exec()
    const informations = await Informations.findOne({RestaurantId: restaurantId}).exec()
    let currency = 'Ft'
    

    generateHeader(doc, invoiceId, restaurant, informations, language)
    generateInvoiceTable(doc, invoice, 1, currency, language)

    await Invoice.create({email: email, RestaurantId: restaurantId, invoiceName: path, date: new Date().toISOString()})

    doc.on('end', async() => {
        await callback()
    })

    doc.end();
    if(process.env.TESTING === '0')
        doc.pipe(fs.createWriteStream('public/invoices/' + path));
    else
        await callback()
}

async function createMultiInvoice(invoice, path, invoiceId, restaurantId, email, peopleCount, language, callback) {
    let doc = new PDFDocument({ size: "A4", margin: 50 });

    const restaurant = await Restaurant.findById(restaurantId).exec()
    const informations = await Informations.findOne({RestaurantId: restaurantId}).exec()
    const currency = getCurrency()

    for(let i = 0; i < peopleCount; ++i) {
        generateHeader(doc, invoiceId, restaurant, informations, language)
        generateInvoiceTable(doc, invoice, peopleCount, currency, language)

        if(i !== peopleCount - 1)
            doc.addPage()
    }


    await Invoice.create({email: email, RestaurantId: restaurantId, invoiceName: path, date: new Date().toISOString()})

    doc.on('end', async() => {
	    await callback()
    })

    doc.flushPages()
    doc.end();
    if(process.env.TESTING === '0') 
        doc.pipe(fs.createWriteStream('public/invoices/' + path));
    else
        await callback()

    return doc
}

function generateHeader(doc, invoiceId, restaurant, informations, language) {
    if(process.env.TESTING === '0') {
        doc
            .font(path.join(__dirname, 'Arimo-Regular.ttf'))
    }

    doc
        .fillColor("#000")
        .fontSize(20)
        .text("", 110, 57)
        .fontSize(10)
        .text(`${translations['invoice-id'][language]}:`, 50, 50)
        .text(invoiceId, 150, 50)
        .text(`${translations['date'][language]}:`, 50, 65)
        .text(formatDate(new Date()), 150, 65)
        .text(`${restaurant.restaurantName ?? ''}`, 200, 50, { align: "right" })
        .text(`${informations.address ?? ''}`, 200, 65, { align: "right" })
        .text(`${informations.postalCode ?? ''} ${informations.city ?? ''}`, 200, 80, { align: "right" })
        .moveDown();

    doc
        .fontSize(20)
        .text(translations['invoice'][language], 50, 120, {align: 'center'});
}

function generateInvoiceTable(doc, items, divisor=1, currency, language) {
    let invoiceTableTop = 190;

    generateTableRow(
        doc,
        invoiceTableTop,
        translations['product-name'][language],
        translations['unit-price'][language],
        translations['quantity'][language],
        translations['subtotal'][language],
    );
    generateHr(doc, invoiceTableTop + 20);

    let i = 0;
    let offset = 0
    for (const item of items) {
        let position = invoiceTableTop + (i + 1) * 30 + offset;
        if(position > 730) {
            doc.addPage()
            invoiceTableTop = 0;
            i = 0;
            offset = 0;
        }
        position = invoiceTableTop + (i + 1) * 30 + offset;
        generateTableRow(
            doc,
            position,
            item.name,
            formatCurrency(item.price, currency),
            item.quantity,
            formatCurrency(item.quantity * item.price, currency)
        );
        if(item.name.length >= 65) {
            generateHr(doc, position + 30);
            offset += 10
        }else{
            generateHr(doc, position + 20);
        }
        i++
    }

    const subtotalPosition = invoiceTableTop + (i + 1) * 30 + offset;
    generateTableRow(
        doc,
        subtotalPosition,
        "",
        translations['total'][language],
        "",
        formatCurrency((items.reduce((part, item) => part + item.price * item.quantity, 0)) / divisor, currency)
    );

}

function generateTableRow(doc, y, item, unitCost, quantity, lineTotal) {
    doc
        .fontSize(10)
        .text(item, 50, y, {width: 290})
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
}

function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

function formatCurrency(forints, currency) {
    if(currency === 'Ft')
    	return Number(forints).toFixed(0).toString() + ' ' + currency

    return Number(forints).toFixed(2).toString() + ' ' + currency
}

function formatDate(date) {
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    const month = date.getMonth() < 9 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1);
    const year = date.getFullYear();

    return year + "-" + month + "-" + day;
}

module.exports = {createInvoice, createMultiInvoice}
