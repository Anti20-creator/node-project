const mongoose     = require('mongoose')
const express      = require('express')
const nodemailer   = require('nodemailer')
const jwt          = require('jsonwebtoken')
const router       = express.Router()
const UserModel    = require('../models/UserModel')
const Layout       = require('../models/LayoutModel')
const Menu         = require('../models/MenuModel')
const Restaurant   = require('../models/RestaurantModel')
const Httpresponse = require('../utils/ErrorCreator')
const Tokens       = require('../utils/TokenFunctions')
const {authenticateRefreshToken, authenticateAccessToken} = require("../middlewares/auth")
const {sendMail}  = require("../utils/EmailSender")
const crypto      = require('crypto')

router.post('/register-admin', async (req, res) => {

    const {name, email, password, restaurantName} = req.body

    const newUser = new UserModel({
        email: email,
        fullName: name,
        password: password,
        restaurantName: restaurantName,
        restaurantId: null,
        isAdmin: true
    })

    await newUser.validate()
        .catch((err) => {
            const {email, fullName, password, restaurantName} = err.errors
            const errors = [
                {email: email ? email.message : ''},
                {fullName: fullName ? fullName.message : ''},
                {password: password ? password.message : ''},
                {restaurantName: restaurantName ? restaurantName.message : ''}
            ]
            return Httpresponse.Conflict(res, "Error while trying to create your account!", errors)
        })
    
    

    await newUser.save(async (err, document) => {
        if(err){
            return Httpresponse.Conflict(res, "User already exists with the given email!")
        }else{
            const restaurant = await Restaurant.create({
                ownerEmail: email,
                ownerId: document._id,
                restaurantName: restaurantName,
                secretPin: crypto.randomBytes(5).toString('hex')
            })

            await document.updateOne({
                restaurantId: restaurant._id
            }).exec()

            await Layout.create({
                RestaurantId: restaurant._id
            })
            await Menu.create({
                RestaurantId: restaurant._id
            })

            return Httpresponse.Created(res, "User has been added!")
        }
    })
})

router.post('/register-employee/:id', async (req, res) => {
    const {name, email, password, secretPin} = req.body

    const restaurantId = req.params.id
    let restaurantName = null
    let restaurantsPin = null

    const restaurant = await Restaurant.findById(restaurantId).exec()

    restaurantsPin = restaurant.secretPin

    if(!restaurant){
        return res.status(400).send({
            success: false,
            message: "Restaurant doesn't exist with the given id."
        })
    }else if(restaurantsPin !== secretPin){
        return Httpresponse.BadRequest(res, "The secret PIN doesn't match")
    }else{

        if(!restaurant.invited.includes(email)) {
            return Httpresponse.NotFound(res, "The given email has not been invited!")
        }

        restaurantName = restaurant.restaurantName

        const newUser = new UserModel({
            email: email,
            fullName: name,
            password: password,
            restaurantName: restaurantName,
            restaurantId: restaurantId,
            isAdmin: false
        })

        await newUser.validate().catch((err) => {
            const {email, fullName, password, restaurantName} = err.errors
            const errors = [
                {email: email ? email.message : ''},
                {fullName: fullName ? fullName.message : ''},
                {password: password ? password.message : ''},
                {restaurantName: restaurantName ? restaurantName.message : ''}
            ]
            return Httpresponse.Conflict(res, "Error while trying to create your account!", errors)
        })

        await newUser.save((err) => {
            if (err) {
                return Httpresponse.Conflict(res, "User already exists with the given email!")
            }
	     /*else {
                return Httpresponse.Created(res, "User has been added!")
            }*/
        })


        /*await newUser.validate().then(async () => {
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
        })*/

    }
    restaurant.invited = restaurant.invited.filter(inv => inv !== email)
    await restaurant.save()

    return Httpresponse.Created(res, "User has been added!")
})

/*
* Refresh and access token should contain ownerEmail, this must be modified in the future.
* */
router.post('/send-invite', authenticateAccessToken, async (req, res) => {

    const { emailTo } = req.body

    const restaurant = await Restaurant.findById(req.user.restaurantId).exec()

    if(!restaurant) {
	return Httpresponse.BadRequest(res, "No restaurant found with the given information")
    }
    restaurant.invited.push(emailTo)

    const emailSuccess = await sendMail(emailTo, 'Inviting to Restaurant', `<h1>Invitation</h1>
                <a href="frontend.com/invite/${restaurant.restaurantId}">Click here to join</a>
                Secret PIN code to join: ${restaurant.secretPin}`, res)

    if(emailSuccess) {
	    await restaurant.save()
        return Httpresponse.OK(res, "User invited!")
    }else{
        return Httpresponse.BadRequest(res, "Failed to send e-mail!")
    }

})

router.post('/login', async(req, res) => {

    const {email, password} = req.body
    let userData = null

    const user = UserModel.findOne({email: email}, (err, data) => {
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

router.get('/logout', async(req, res) => {
    const cookie = req.cookies;
    for (const prop in cookie) {
        if (!cookie.hasOwnProperty(prop)) {
            continue;
        }
        res.cookie(prop, '', {expires: new Date(0)});
    }
    res.end()
})

router.get('/team', authenticateAccessToken, async(req, res) => {

    const team = await UserModel.find({restaurantId: req.user.restaurantId}).exec()
    const restaurant = await Restaurant.findById(req.user.restaurantId).exec()

    return Httpresponse.OK(res, team.concat(restaurant.invited.map(email => ({email: email}))))
})


module.exports = router
