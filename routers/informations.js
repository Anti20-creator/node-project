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
    
    return Httpresponse.OK(res, infos)
    
})

router.post('/update', authenticateAccessToken, async(req, res) => {
    
    const {taxNumber, address, city, postalCode, phoneNumber} = req.body
    
    const infos = await Informations.findOne({RestaurantId: req.user.restaurantId}).exec()
    
    if(!infos) {
        return Httpresponse.NotFound(res, "No informations found!")
    }

    console.log(req.body)
    await infos.updateOne({
        taxNumber, address, city, postalCode, phoneNumber
    })
    
    return Httpresponse.OK(res, "Updated!")

})

module.exports = router
