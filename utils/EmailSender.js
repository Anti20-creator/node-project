const nodemailer = require("nodemailer");
const Httpresponse = require("./ErrorCreator");

async function sendMail(emailTo, subject, htmlContent, res) {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.NODEMAILER_USER, // generated ethereal user
            pass: process.env.NODEMAILER_PWD, // generated ethereal password
        }
    });

    const info = await transporter.sendMail({
        from: process.env.NODEMAILER_SENDER,
        to: emailTo,
        subject: subject,
        html: htmlContent
    })

    return info
}

module.exports = {sendMail};
