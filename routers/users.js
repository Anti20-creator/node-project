const mongoose     = require('mongoose')
const express      = require('express')
const nodemailer   = require('nodemailer')
const jwt          = require('jsonwebtoken')
const router       = express.Router()
const UserModel    = require('../models/UserModel')
const Restaurant   = require('../models/RestaurantModel')
const Httpresponse = require('../utils/ErrorCreator')
const Tokens       = require('../utils/TokenFunctions')
const {authenticateRefreshToken, authenticateAccessToken} = require("../middlewares/auth");

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
                Httpresponse.Conflict(res, "User already exists with the given email!")
            }else{
                Httpresponse.Created(res, "User has been added!")
            }
        })
    }).catch((err) => {
        const {email, fullName, password, restaurantName} = err.errors
        const errors = [
            {email: email ? email.message : ''},
            {fullName: fullName ? fullName.message : ''},
            {password: password ? password.message : ''},
            {restaurantName: restaurantName ? restaurantName.message : ''}
        ]
        Httpresponse.Conflict(res, "Error while trying to create your account!", errors)
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
        Httpresponse.Conflict(res, "The secret PIN doesn't match")
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


        await newUser.validate().then(async () => {
            await newUser.save((err) => {
                if (err) {
                    return Httpresponse.Conflict(res, "User already exists with the given email!")
                } else {
                    return Httpresponse.Created(res, "User has been added!")
                }
            }).then(() => console.log('Job completed'))
        }).catch((err) => {
            const {email, fullName, password, restaurantName} = err.errors
            const errors = [
                {email: email ? email.message : ''},
                {fullName: fullName ? fullName.message : ''},
                {password: password ? password.message : ''},
                {restaurantName: restaurantName ? restaurantName.message : ''}
            ]
            Httpresponse.Conflict(res, "Error while trying to create your account!", errors)
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
        }
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
            Httpresponse.OK(res, "Invitation sent!")
        }
    })
})

router.post('/login', async(req, res) => {

    console.log(req.cookies)

    const {email, password} = req.body
    let userData = null

    const user = UserModel.findOne({email: email}, (err, data) => {
        console.log(data)
        /* Case: User existst with the given email */
        if(!err) {

            /* Case: the passwords matches the stored one */
            if(data.comparePassword(password)){

                const accessToken = Tokens.generateAccessToken(data)
                const refreshToken = Tokens.generateRefreshToken(data)
                res.cookie('Authorization', 'Bearer '.concat(accessToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})
                res.cookie('Refresh-token', 'Bearer '.concat(refreshToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})

                Httpresponse.OK(res, "User has logged in!")
            }else{
                Httpresponse.Unauthorized(res, "Password is incorrect!")
            }
        }else{
            Httpresponse.Unauthorized(res, "Authentication failed!")
        }

    })
})

router.get('/getdata', authenticateAccessToken, async(req, res) => {

    const user = req.user

    UserModel.findOne({_id: user.userId}, (err, data) => {
        if(err){
            Httpresponse.Unauthorized(res, err)
        }else{
            res.status(200).send({
                email: data.email
            })
        }
    })
})

router.post('/refresh-token', authenticateRefreshToken, async(req, res) => {

    const user = req.user;

    UserModel.findOne({_id: user.userId}, (err, data) => {
        if(err){
            Httpresponse.Unauthorized(res, "Failed to refresh token")
        }else{

            const accessToken = Tokens.generateAccessToken(data)

            res.cookie('Authorization', 'Bearer '.concat(accessToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})
            Httpresponse.OK(res, accessToken)
        }
    })
})


module.exports = router