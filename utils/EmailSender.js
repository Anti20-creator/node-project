const nodemailer = require("nodemailer");
const Httpresponse = require("./ErrorCreator");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.NODEMAILER_USER, // generated ethereal user
        pass: process.env.NODEMAILER_PWD, // generated ethereal password
    },
    pool: true,
    maxMessages: Infinity
});

async function sendMail(emailTo, subject, htmlContent, fileName, res) {
    const info = await transporter.sendMail({
        from: process.env.NODEMAILER_SENDER,
        to: emailTo,
        subject: subject,
        html: htmlContent,
        attachments: [fileName ? {
            filename: fileName + '.zip',
            path: __dirname + '/../public/invoice_zips/' + fileName + '.zip' 
        } : {}]
    })

    return info
}

module.exports = {sendMail};
