const mongoose    = require('mongoose')
const express     = require('express')
const nodemailer  = require('nodemailer')
const jwt         = require('jsonwebtoken')
const router      = express.Router()
const UserModel   = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')

router.post('/register-admin', (req, res) => {

    const {name, email, password, restaurantName} = req.body

    const newUser = new UserModel({
        email: email,
        fullName: name,
        password: password,
        restaurantName: restaurantName,
        restaurantId: null,
        isAdmin: true
    })

    newUser.validate().then(() => {
        newUser.save((err) => {
            if(err){
                res.status(400).send({
                    success: false,
                    message: "User already exists with the given email!"
                })
            }else{
                res.status(200).send({
                    success: true,
                    message: "User has been added!"
                })
            }
        })
    }).catch((err) => {
        const {email, fullName, password, restaurantName} = err.errors
        res.send({
            success: false,
            message: "Error while trying to create your account!",
            errors: [
                {email: email ? email.message : ''},
                {fullName: fullName ? fullName.message : ''},
                {password: password ? password.message : ''},
                {restaurantName: restaurantName ? restaurantName.message : ''}
            ]
        })
    })
})

router.post('/register-employee/:id', async (req, res) => {
    const {name, email, password, secretPin} = req.body

    const restaurantId = req.params.id
    let restaurantName = null
    let restaurantsPin = null

    const restaurant = await Restaurant.findById(restaurantId,function (err, data)  {
        restaurantsPin = data.secretPin
    })

    if(!restaurant){
        res.status(400).send({
            success: false,
            message: "Restaurant doesn't exist with the given id."
        })
    }else if(restaurantsPin !== secretPin){
        res.status(400).send({
            success: false,
            message: `The secret PIN doesn't match ${secretPin} != ${restaurantsPin}`
        })
    }else{
        restaurantName = restaurant.restaurantName

        const newUser = new UserModel({
            email: email,
            fullName: name,
            password: password,
            restaurantName: restaurantName,
            restaurantId: restaurantId,
            isAdmin: false
        })


        newUser.validate().then(() => {
            newUser.save((err) => {
                if (err) {
                    res.status(400).send({
                        success: false,
                        message: "User already exists with the given email!"
                    })
                } else {
                    res.status(200).send({
                        success: true,
                        message: "User has been added!"
                    })
                }
            }).then(() => console.log('Job completed'))
        }).catch((err) => {
            const {email, fullName, password, restaurantName} = err.errors
            res.send({
                success: false,
                message: "Error while trying to create your account!",
                errors: [
                    {email: email ? email.message : ''},
                    {fullName: fullName ? fullName.message : ''},
                    {password: password ? password.message : ''},
                    {restaurantName: restaurantName ? restaurantName.message : ''}
                ]
            })
        })

    }

})

/*
* Refresh and access token should contain ownerEmail, this must be modified in the future.
* */
router.post('/send-invite', async (req, res) => {
    
    const {ownerEmail, emailTo} = req.body

    let restaurantId = null
    let secretPin    = null

    const restaurant = await Restaurant.findOne({ownerEmail: ownerEmail}, (err, data) => {
        if(err){
            console.log(err)
            res.status(400).send({
                success: false,
                message: "No restaurant found with the given information!"
            })
        }else{
            console.log(data)
            restaurantId = data._id
            secretPin    = data.secretPin
        }
    })


    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.NODEMAILER_USER, // generated ethereal user
            pass: process.env.NODEMAILER_PWD, // generated ethereal password
        },
    });

    const info = await transporter.sendMail({
        from: 'Anti - b264lke@gmail.com',
        to: emailTo,
        subject: 'Inviting to Restaurant',
        html: `<h1>Invitation</h1>
                <a href="frontend.com/invite/${restaurantId}">Click here to join</a>
                Secret PIN code to join: ${secretPin}`
    }, (err, data) => {
        console.log(err)
        if(err){
            res.status(400).send({
                success: false,
                message: "Failed to send invite!"
            })
        }else{
            res.status(400).send({
                success: true,
                message: "Invitation sent!"
            })
        }
    })
})

router.post('/login', async(req, res) => {

    const {email, password} = req.body
    let userData = null

    const user = UserModel.findOne({email: email}, (err, data) => {
        console.log(data)
        if(!err) {
            userData = data
            const token = jwt.sign({
                userId: data._id,
                isAdmin: data.isAdmin,
                restaurant: data.restaurantId
            }, process.env.TOKEN_SECRET)
            res.cookie('authorization', 'Bearer '.concat(token))
            res.status(200).send({
                success: true,
                message: "User has logged in!",
                token: token
            })
        }else{
            res.status(400).send({
                success: false,
                message: "Authentication failed!"
            })
        }

    })
})

module.exports = router