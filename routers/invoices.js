const express = require('express')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth");
const router = express.Router()
const path = require('path')

const Httpresponse = require('../utils/ErrorCreator')
const Invoice = require('../models/InvoiceModel')

router.get('/', authenticateAccessToken, async(req, res) => {

    console.log(req.user)
    if(req.user.isAdmin) {
        return Invoice.find({RestaurantId: req.user.restaurantId}).sort({date: -1}).exec().then(invoices => {
            return Httpresponse.OK(res, invoices.map(invoice => {
                return {...invoice._doc, invoiceName: invoice._doc.invoiceName.split('.')[0].split('_').filter((_, idx) => idx !== 2).join('_') + '.pdf'}
            }))
        })
    }else{
        return Invoice.find({UserId: req.user.email}).sort({date: -1}).exec().then(invoices => {
            return Httpresponse.OK(res, invoices.map(invoice => {
                return {...invoice._doc, invoiceName: invoice._doc.invoiceName.split('.')[0].split('_').filter((_, idx) => idx !== 2).join('_') + '.pdf'}
            }))
        })
    }

    //return Httpresponse.OK(res, invoices)
})

router.get('/download/:invoiceName', authenticateAccessToken, async(req, res) => {

    const invoiceName = req.params.invoiceName.slice(0, -4) + '_' + req.user.restaurantId + '.pdf'
    console.log(req.params.invoiceName)
    console.log(invoiceName)
    return res.download(__dirname + '/../public/invoices/' + invoiceName, invoiceName);

});

module.exports = router
