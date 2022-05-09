const express                                                 = require('express')
const router                                                  = express.Router()
const Httpresponse                                            = require('../utils/ErrorCreator')
const InformationsController                                  = require('../controller/informationsController')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth");
const { catchErrors }                                         = require('../utils/ErrorHandler')
const RequestValidator                                        = require('../controller/bodychecker')
const path                                                    = require('path')

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {

    const infos = await InformationsController.findById(req.user.restaurantId)

    return Httpresponse.OK(res, {...infos._doc, openingTimes: infos.openingTimes.map(data => data.open.hours + ':' + data.open.minutes + '-' + data.close.hours + ':' + data.close.minutes)})
}))

router.get('/currency', authenticateAccessToken, catchErrors(async(req, res) => {

    const infos = await InformationsController.findById(req.user.restaurantId)

    if(infos.currency === 'USD') infos.currency = '$'
    if(infos.currency === 'EUR') infos.currency = '€'
    if(infos.currency === 'HUF') infos.currency = 'Ft'

    return Httpresponse.OK(res, infos.currency)
}))

router.post('/update', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const {taxNumber, address, city, postalCode, phoneNumber, openingTimes, currency} = RequestValidator.destructureBody(req, {taxNumber: 'string', address: 'string', city: 'string', postalCode: 'string', phoneNumber: 'string', openingTimes: 'object', currency: 'string'})

    const infos = await InformationsController.findById(req.user.restaurantId)
    infos.taxNumber = taxNumber; infos.address = address; infos.city = city; infos.postalCode = postalCode; infos.phoneNumber = phoneNumber; infos.openingTimes = openingTimes; infos.currency = currency;

    await infos.save()

    return Httpresponse.OK(res, "informations-updated")
}))

module.exports = router
