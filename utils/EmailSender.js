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
    }, (err, data) => {
        console.log(err)
        if(err){
            return res.status(400).send({
                success: false,
                message: "Failed to send e-mail!"
            })
        }
    })
}

module.exports = {sendMail};
