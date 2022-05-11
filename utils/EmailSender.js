const nodemailer = require('nodemailer')
const moment     = require('moment-timezone')

const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PWD,
    },
    pool: true,
    maxMessages: Infinity,
    tls: {
        rejectUnauthorized: false
    }
})

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

function sendBookedAppointmentEmail(emailTo, appointmentData, language='en') {
    if(language === 'hu') {
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Foglalás rögzítve',
            html: `<h1>Foglalása rögzítésre került.</h1>
                    <p>További tájékoztatásokat a megadott e-mail címre küldjük Önnek.</p>
                    <p>Adatok:<p>
                    <ul>
                        <li>Időpont: ${moment(appointmentData.date).utc(0).format('YYYY-MM-DD HH:mm')}</li>
                        <li>Vendégek száma: ${appointmentData.peopleCount}</li>
                        <li>Kód: ${appointmentData.code}</li>
                    </ul>
                    <p>${appointmentData.accepted ? '<p>Várjuk a foglalt időpontban!</p>' : ''}</p>
                    <p>Foglalás lemondása itt: ${process.env.FRONTEND_URL + 'remove-appointment/' + appointmentData._id}</p>` 
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
                        <li>Date: ${moment(appointmentData.date).utc(0).format('YYYY-MM-DD HH:mm')}</li>
                        <li>People: ${appointmentData.peopleCount}</li>
                        <li>Code: ${appointmentData.code}</li>
                    </ul>
                    <p>${appointmentData.accepted ? '<p>We are waiting for you at the booked time.</p>' : ''}</p>
                    <p>Remove appointment here: ${process.env.FRONTEND_URL + 'remove-appointment/' + appointmentData._id}</p>` 
        })
    }
}
function sendDeletedAppointmentEmail(emailTo, language='en') {
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
function sendUpdatedAppointmentEmail(emailTo, accepted, language='en') {
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

function sendWelcomeEmail(emailTo, restaurantId, language='en') {
    if(language === 'hu') {
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Sikeres regisztráció',
            html: `
                <h1>A felhasználó fiókja sikeresen létre lett hozva!</h1>
                <p>Most már be tud jelentkezni a korábban megadott adataival.
                <br>
                Éttermének azonosítója: ${restaurantId}.</p>
                `
            })
    }else{
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Successful registration',
            html: `
                <h1>Your account has been created successfully!</h1>
                <p>Now you can log in to your account with your credentials.
                <br>
                Id of your restastaurant is: ${restaurantId}.</p>
            `
        })
    }
}

function sendInvitationEmail(emailTo, restaurantId, pin, language='en') {
    if(language === 'hu') {
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Meghívó',
            html: `
                <h1>Önnek meghívója érkezett!</h1>
                <p>Itt tud regisztrálni: ${process.env.FRONTEND_URL + 'invite/' + restaurantId}</p>
                <p>Kód a csatlakozáshoz: ${pin}</p>
                `
            })
    }else{
        transporter.sendMail({
            from: process.env.NODEMAILER_SENDER,
            to: emailTo,
            subject: 'Invitation',
            html: `
                <h1>You have an invitation!</h1>
                <p>You can register here: ${process.env.FRONTEND_URL + 'invite/' + restaurantId}</p>
                <p>Pin to join: ${pin}</p>
            `
        })
    }
}

module.exports = {
    sendMail, 
    sendBookedAppointmentEmail, 
    sendDeletedAppointmentEmail,
    sendUpdatedAppointmentEmail,
    sendWelcomeEmail,
    sendInvitationEmail
};
