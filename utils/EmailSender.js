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
            + appointmentData.accepted ? '<p>Várjuk a foglalt időpontban!</p>' : '' 
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
            + appointmentData.accepted ? '<p>We are waiting for you at the booked time.</p>' : '' 

        })
    }
}
function sendDeletedAppointmentEmail(emailTo, language='hu') {
    if(language === 'hu') {
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Foglalásának állapota módosult',
            html: `<h1>Foglalása törlésre került.</h1>
                    <p>Amennyiben úgy érzi, hogy hiba történhetett, kérjük vegye fel a kapcsolatot a megfelelő vendéglátó hellyel.</p>`
        })
    }else{
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Your appointment has been removed',
            html: `<h1>Your appointment has been removed from the system.</h1>
                    <p>If you think there might be an issue, please contact the corresponding catering unit!</p>`
        })
    }
}
function sendUpdatedAppointmentEmail(emailTo, accepted, language='hu') {
    if(language === 'hu') {
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Foglalásának állapota módosult',
            html: accepted ? 
            `<h1>Foglalása jóvá lett hagyva!</h1>
            <p>Várjuk a korábban foglalt időpontban!</p>` 
                : 
            `<h1>Foglalása elutasításra került.</h1>
            <p>Amennyiben úgy érzi, hogy hiba történhetett, kérjük vegye fel a kapcsolatot a megfelelő vendéglátó hellyel.</p>`
        })
    }else{
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Your appointment\'s status has been updated',
            html: accepted ?
            `<h1>Your appointment has been accepted.</h1>
            <p>We are waiting for you at the booked time!</p>`
                :
            `<h1>Your appointment has been declined.</h1>
                    <p>If you think there might be an issue, please contact the corresponding catering unit!</p>`
        })
    }
}


module.exports = {
    sendMail, 
    sendBookedAppointmentEmail, 
    sendDeletedAppointmentEmail,
    sendUpdatedAppointmentEmail
};
