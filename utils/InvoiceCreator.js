const PDFDocument = require("pdfkit");
const fs = require("fs");

function createInvoice(invoice, path, invoiceId) {
    let doc = new PDFDocument({ size: "A4", margin: 50 });

    generateHeader(doc, invoiceId);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc);

    doc.end();
    doc.pipe(fs.createWriteStream('public/invoices/' + path));
    return doc
}

function generateHeader(doc, invoiceId) {
    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("", 110, 57)
        .fontSize(10)
        .text("Invoice ID:", 50, 50)
        .text(invoiceId, 150, 50)
        .text("Invoice date:", 50, 65)
        .text(formatDate(new Date()), 150, 65)
        .text("Manna Lounge & Étterem", 200, 50, { align: "right" })
        .text("Palota út 17.", 200, 65, { align: "right" })
        .text("1013 Budapest", 200, 80, { align: "right" })
        .moveDown();

    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Invoice", 50, 160, {align: 'center'});
}

function generateInvoiceTable(doc, items) {
    const invoiceTableTop = 230;

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Item",
        "Description",
        "Unit Cost",
        "Quantity",
        "Line Total"
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    let i = 0;
    for (const item of items) {
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.name,
            formatCurrency(item.price),
            item.quantity,
            formatCurrency(item.quantity * item.price)
        );

        generateHr(doc, position + 20);
        i++
    }

    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        subtotalPosition,
        "",
        "Subtotal",
        "",
        formatCurrency(items.reduce((part, item) => part + item.price * item.quantity, 0))
    );

}

function generateFooter(doc) {
    doc
        .fontSize(10)
        .text(
            "Invoice generated by Restify",
            50,
            660,
            { align: "center", width: 500 }
        );
}

function generateTableRow(
    doc,
    y,
    item,
    unitCost,
    quantity,
    lineTotal
) {
    doc
        .fontSize(10)
        .text(item, 50, y)
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

function formatCurrency(forints) {
    return forints.toFixed(2).toString() + ' Ft'
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return year + "/" + month + "/" + day;
}

module.exports = {createInvoice}