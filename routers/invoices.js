const express                     = require('express')
const router                      = express.Router()
const { authenticateAccessToken } = require("../middlewares/auth");
const Httpresponse                = require('../utils/ErrorCreator')
const Invoice                     = require('../models/InvoiceModel')
const { catchErrors }             = require('../utils/ErrorHandler')

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {

    let invoices = []
    if(req.user.isAdmin) {
        invoices = await Invoice.find({RestaurantId: req.user.restaurantId}).sort({date: -1}).exec()
    }else{
        invoices = await Invoice.find({UserId: req.user.userId}).sort({date: -1}).exec()
    }

    return Httpresponse.OK(res, invoices.map(invoice => {
        return {...invoice._doc, invoiceName: invoice._doc.invoiceName.split('.')[0].split('_').filter((_, idx) => idx !== 2).join('_') + '.pdf'}
    }))
}))

router.get('/download/:invoiceName', authenticateAccessToken, catchErrors(async(req, res) => {

    const invoiceName = req.params.invoiceName.slice(0, -4) + '_' + req.user.restaurantId + '.pdf'
    return res.download(__dirname + '/../public/invoices/' + invoiceName, invoiceName);
    
}))

module.exports = router
