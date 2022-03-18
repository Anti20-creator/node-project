const express = require('express')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth");
const router = express.Router()
const path = require('path')

const Httpresponse = require('../utils/ErrorCreator')
const Informations = require('../models/InformationsModel')

router.get('/', authenticateAccessToken, async(req, res) => {

    const infos = await Informations.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!infos) {
        return Httpresponse.NotFound(res, "No informations found!")
    }

    return Httpresponse.OK(res, {...infos._doc, openingTimes: infos.openingTimes.map(data => data.open.hours + ':' + data.open.minutes + '-' + data.close.hours + ':' + data.close.minutes)})

})

router.get('/currency', authenticateAccessToken, async(req, res) => {

    const infos = await Informations.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!infos) {
	return Httpresponse.NotFound(res, "No informations found!")
    }

    if(infos.currency === 'USD') infos.currency = '$'
    if(infos.currency === 'EUR') infos.currency = '€'
    if(infos.currency === 'HUF') infos.currency = 'Ft'

    return Httpresponse.OK(res, infos.currency)

})

router.post('/update', authenticateAccessToken, async(req, res) => {

    const {taxNumber, address, city, postalCode, phoneNumber, openingTimes, currency} = req.body

    const infos = await Informations.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!infos) {
        return Httpresponse.NotFound(res, "No informations found!")
    }

    console.log(req.body)
    await infos.updateOne({
        taxNumber, address, city, postalCode, phoneNumber, openingTimes, currency
    })

    return Httpresponse.OK(res, "Updated!")

})

module.exports = router
