const mongoose     = require('mongoose')
const express      = require('express')
const nodemailer   = require('nodemailer')
const jwt          = require('jsonwebtoken')
const router       = express.Router()
require('dotenv').config()
const UserModel    = require('../models/UserModel')
const Layout       = require('../models/LayoutModel')
const Menu         = require('../models/MenuModel')
const Restaurant   = require('../models/RestaurantModel')
const Informations = require('../models/InformationsModel')

const Httpresponse = require('../utils/ErrorCreator')
const Tokens       = require('../utils/TokenFunctions')
const {authenticateRefreshToken, authenticateAccessToken, authenticateAdminAccessToken, authenticateOwnerAccessToken} = require("../middlewares/auth")
const {sendMail}  = require("../utils/EmailSender")
const crypto      = require('crypto')

router.get('/restaurant-id', authenticateAccessToken, (req, res) => {

	return Httpresponse.OK(res, req.user.restaurantId)

})

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
                secretPin: process.env.PRODUCTION === '0' ? '1234' : crypto.randomBytes(5).toString('hex')
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
            await Informations.create({
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
                <a href="http://192.168.31.161:3000/invite/${restaurant._id}">Kattints ide a csatlakozáshoz</a>
                Étterem PIN kódja: ${restaurant.secretPin}`, res)

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
	console.log(data)
        /* Case: User existst with the given email */
        if(!err && data) {

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

    const data = await UserModel.findOne({_id: user.userId}).exec()
    if(!data)
	return Httpresponse.Unauthorized(res, "Unathorized!")

    return Httpresponse.OK(res, data.email)
})

router.get('/is-admin', authenticateAccessToken, async(req, res) => {

    const user = await UserModel.findById(req.user.userId).exec()

    if(!user) {
        return Httpresponse.NotFound(res, false)
    }

    return Httpresponse.OK(res, user.isAdmin)
})

router.post('/refresh-token', authenticateRefreshToken, async(req, res) => {

    const user = req.user
    console.log(user)

    const dbUser = await UserModel.findOne({_id: user.userId}).exec()
    if(!dbUser) {
	return Httpresponse.Unauthorized(res, "Failed to refresh token")
    }

    const accessToken = Tokens.generateAccessToken(dbUser)
    res.cookie('Authorization', 'Bearer '.concat(accessToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})
    return Httpresponse.OK(res, accessToken)
})

router.post('/update-rank', authenticateAdminAccessToken, async (req, res) => {

    const { promote, email } = req.body;

    const user = await UserModel.findOne({email}).exec()

    if(!user) {
        return Httpresponse.NotFound(res, "No user found with given email!")
    }
    const userRestaurant = await Restaurant.findOne({ownerId: user._id}).exec()
    const requestRestaraunt = await Restaurant.findById(req.user.restaurantId).exec()

    if(user.isAdmin && !promote && userRestaurant) {
        return Httpresponse.BadRequest(res, "You can't change owner's rank!")
    }

    if(user.isAdmin && !promote && requestRestaraunt.ownerId !== req.user.userId) {
        return Httpresponse.BadRequest(res, "You can't change another admin's rank!")
    }

    if(promote) {
        await user.updateOne({
            isAdmin: true
        })
    }else{
        await user.updateOne({
            isAdmin: false
        })
    }

    return Httpresponse.OK(res, "User's role has been changed!")
})

router.get('/logout', async(req, res) => {
    res.cookie('Authorization', '', {httpOnly: false, sameSite: 'none', path: '/', secure: true})
    res.cookie('Refresh-token', '', {httpOnly: false, sameSite: 'none', path: '/', secure: true})
    res.end()
})

router.delete('/delete', authenticateOwnerAccessToken, async(req, res) => {

    const { email } = req.body

    console.log(email)
    if(req.user.email === email) {
	return Httpresponse.BadRequest(res, "You can't remove yourself!")
    }
    await UserModel.deleteOne({email}).exec()

    return Httpresponse.OK(res, "User has been removed!")
})

router.get('/team', authenticateAccessToken, async(req, res) => {

    const team = await UserModel.find({restaurantId: req.user.restaurantId}).exec()
    const restaurant = await Restaurant.findById(req.user.restaurantId).exec()

    return Httpresponse.OK(res, team.concat(restaurant.invited.map(email => ({email: email}))))
})


module.exports = router
