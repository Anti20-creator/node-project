const nodemailer = require("nodemailer");

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

async function sendMail(emailTo, subject, htmlContent, fileName) {

    const info = await transporter.sendMail({
        from: process.env.NODEMAILER_SENDER,
        to: emailTo,
        subject: subject,
        html: htmlContent,
        attachments: fileName ? [ {
            filename: fileName + '.zip',
            path: __dirname + '/../public/invoice_zips/' + fileName + '.zip' 
        }] : []
    })

    console.log(info)

    return info
}

function sendBookedAppointmentEmail(emailTo, appointmentData, language='hu') {

    if(language === 'hu') {
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Foglalás rögzítve',
            html: `<h1>Foglalása rögzítésre került.</h1>
                    <p>További tájékoztatásokat a megadott e-mail címre küldjük Önnek.</p>
                    <p>Adatok:<p>
                    <ul>
                        <li>Időpont: ${appointmentData.date}</li>
                        <li>Vendégek száma: ${appointmentData.peopleCount}</li>
                        <li>Kód: ${appointmentData.code}</li>
                    </ul>`
        })
    }else{
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Appointment booked',
            html: `<h1>Your date has been booked.</h1>
                    <p>We will send you further informations here as well!</p>
                    <p>Details:<p>
                    <ul>
                        <li>Date: ${appointmentData.date}</li>
                        <li>People: ${appointmentData.peopleCount}</li>
                        <li>Code: ${appointmentData.code}</li>
                    </ul>`
        })
    }
}

module.exports = {sendMail, sendBookedAppointmentEmail};
