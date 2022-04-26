const express      = require('express')
const bcrypt       = require('bcrypt')
const router       = express.Router()
require('dotenv').config()
const User         = require('../models/UserModel')
const Layout       = require('../models/LayoutModel')
const Menu         = require('../models/MenuModel')
const Restaurant   = require('../models/RestaurantModel')
const Informations = require('../models/InformationsModel')
const Httpresponse = require('../utils/ErrorCreator')
const Tokens       = require('../utils/TokenFunctions')
const {authenticateRefreshToken, authenticateAccessToken, authenticateAdminAccessToken, authenticateOwnerAccessToken} = require("../middlewares/auth")
const {sendWelcomeEmail, sendInvitationEmail}   = require("../utils/EmailSender")
const crypto       = require('crypto')
const { catchErrors } = require('../utils/ErrorHandler')
const RequestValidator = require('../controller/bodychecker')
const RestaurantController = require('../controller/restaurantController')

router.get('/restaurant-id', authenticateAccessToken, catchErrors((req, res) => {
	return Httpresponse.OK(res, req.user.restaurantId)
}))

router.post('/register-admin', catchErrors(async(req, res) => {

    const { name, email, password, restaurantName, lang } = RequestValidator.destructureBody(req, res, {name: 'string', email: 'string', password: 'string', restaurantName: 'string', lang: 'string'})

    if(password.length < 5) {
        return Httpresponse.BadRequest(res, "short-password")
    }
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(password, salt)


    const newUser = new User({
        email: email,
        fullName: name,
        password: hashedPassword,
        restaurantName: restaurantName,
        restaurantId: null,
        isAdmin: true
    })

    await newUser.save(async (err, document) => {
        if(err){
            if(err.name === 'ValidationError') {
                return Httpresponse.BadRequest(res, "badly-formatted-data")
            }else{
                return Httpresponse.Conflict(res, "user-email-conflict")
            }
            
        }else{
            const restaurant = await Restaurant.create({
                ownerEmail: email,
                ownerId: document._id,
                restaurantName: restaurantName,
                secretPin: process.env.PRODUCTION === '0' ? '123456' : crypto.randomBytes(3).toString('hex')
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

            sendWelcomeEmail(email, lang)
            return Httpresponse.Created(res, "user-created")
        }
    })
}))

router.post('/register-employee/:id', catchErrors(async(req, res) => {
    
    const { name, email, password, secretPin, lang } = RequestValidator.destructureBody(req, res, {name: 'string', email: 'string', password: 'string', secretPin: 'string', lang: 'string'})
    if(password.length < 5) {
        return Httpresponse.BadRequest(res, "short-password")
    }
    const {id: restaurantId} = RequestValidator.destructureParams(req, res, {id: 'string'})

    const restaurant = await Restaurant.findById(restaurantId).exec()

    if(!restaurant){
        return Httpresponse.BadRequest(res, "restaurant-not-found")
    }else if(restaurant.secretPin !== secretPin){
        return Httpresponse.BadRequest(res, "restaurant-bad-pin")
    }else{

        if(!restaurant.invited.includes(email)) {
            return Httpresponse.NotFound(res, "no-invitation")
        }

        const salt = bcrypt.genSaltSync(10)
        const hashedPassword = bcrypt.hashSync(password, salt)

        const newUser = new User({
            email: email,
            fullName: name,
            password: hashedPassword,
            restaurantName: restaurant.restaurantName,
            restaurantId: restaurantId,
            isAdmin: false
        })

        await newUser.save(async (err) => {
            if(err) {
                if(err.name === 'ValidationError') {
                    return Httpresponse.BadRequest(res, "badly-formatted-data")
                }else{
                    return Httpresponse.Conflict(res, "user-email-conflict")
                }
            }else{
                restaurant.invited = restaurant.invited.filter(inv => inv !== email)
                await restaurant.save()
                sendWelcomeEmail(email, lang)
            
                return Httpresponse.Created(res, "user-created")
            }
        })

    }
}))

/*
* Refresh and access token should contain ownerEmail, this must be modified in the future.
* */
router.post('/send-invite', authenticateAccessToken, catchErrors(async (req, res) => {

    const { emailTo, lang } = RequestValidator.destructureBody(req, res, {emailTo: 'string', lang: 'string'})

    const restaurant = await RestaurantController.findById(req.user.restaurantId)
    const conflictingUser = await User.countDocuments({email: emailTo}).exec()

    if(conflictingUser > 0) {
        return Httpresponse.Conflict(res, "user-email-conflict")
    }

    restaurant.invited.push(emailTo)

    await restaurant.save()
    sendInvitationEmail(emailTo, restaurant._id, restaurant.secretPin, lang)

    return Httpresponse.OK(res, "user-invited")
}))

router.post('/login', catchErrors(async(req, res) => {

    const {email, password} = RequestValidator.destructureBody(req, res, {email: 'string', password: 'string'})

    User.findOne({email: email}, (err, data) => {
        /* Case: User existst with the given email */
        if(!err && data) {

            /* Case: the passwords matches the stored one */
            if(data.comparePassword(password)){

                const accessToken = Tokens.generateAccessToken(data)
                const refreshToken = Tokens.generateRefreshToken(data)
                res.cookie('Authorization', 'Bearer '.concat(accessToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})
                res.cookie('Refresh-token', 'Bearer '.concat(refreshToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})

                Httpresponse.OK(res, "user-logged-in")
            }else{
                Httpresponse.Unauthorized(res, "wrong-password")
            }
        }else{
            Httpresponse.Unauthorized(res, "login-user-not-found")
        }

    })
}))

router.get('/is-admin', authenticateAccessToken, catchErrors(async(req, res) => {

    const user = await User.findById(req.user.userId).exec()

    if(!user) {
        return Httpresponse.NotFound(res, false)
    }

    return Httpresponse.OK(res, user.isAdmin)
}))

router.post('/refresh-token', authenticateRefreshToken, catchErrors(async(req, res) => {

    const user = req.user

    const dbUser = await User.findOne({_id: user.userId}).exec()
    if(!dbUser) {
	    return Httpresponse.Unauthorized(res, "refresh-token-failed-refresh")
    }

    const accessToken = Tokens.generateAccessToken(dbUser)
    res.cookie('Authorization', 'Bearer '.concat(accessToken), {httpOnly: false, sameSite: 'none', path: '/', secure: true})
    return Httpresponse.OK(res, accessToken)
}))

router.post('/update-rank', authenticateAdminAccessToken, catchErrors(async (req, res) => {

    const { promote, email } = RequestValidator.destructureBody(req, res, {promote: 'boolean', email: 'string'})

    const user = await User.findOne({email}).exec()

    if(!user) {
        return Httpresponse.NotFound(res, "user-not-found")
    }
    const userRestaurant = await Restaurant.findOne({ownerId: user._id}).exec()
    const requestRestaraunt = await RestaurantController.findById(req.user.restaurantId)

    if(user.isAdmin && !promote && userRestaurant) {
        return Httpresponse.BadRequest(res, "user-rank-permission-denied")
    }

    if(user.isAdmin && !promote && requestRestaraunt.ownerId !== req.user.userId) {
        return Httpresponse.BadRequest(res, "user-rank-permission-denied")
    }

    if(promote) {
        user.isAdmin = true
        await user.save()
    }else{
        user.isAdmin = false
        await user.save()
    }

    return Httpresponse.OK(res, "user-role-update")
}))

router.get('/logout', catchErrors(async(req, res) => {
    res.cookie('Authorization', '', {httpOnly: false, sameSite: 'none', path: '/', secure: true})
    res.cookie('Refresh-token', '', {httpOnly: false, sameSite: 'none', path: '/', secure: true})
    res.end()
}))

router.delete('/delete', authenticateAdminAccessToken, catchErrors(async(req, res) => {

    const { email } = RequestValidator.destructureBody(req, res, {email: 'string'})

    if(req.user.email === email) {
	    return Httpresponse.BadRequest(res, "user-delete-yourself")
    }

    const user = await User.findOne({email, restaurantId: req.user.restaurantId}).exec()
    const restaurant = await RestaurantController.findById(req.user.restaurantId)
    if(user) {
        if(restaurant.ownerId === user._id) {
            return Httpresponse.BadRequest(res, "user-cant-remove")
        }
        await user.deleteOne({})
    }else{
        if(restaurant.invited.includes(email)) {
            restaurant.invited = restaurant.invited.filter(e => e !== email)
            await restaurant.save()
        }
    }

    return Httpresponse.OK(res, "user-removed")
}))

router.get('/team', authenticateAccessToken, catchErrors(async(req, res) => {

    const team = await User.find({restaurantId: req.user.restaurantId}).exec()
    const restaurant = await RestaurantController.findById(req.user.restaurantId)

    return Httpresponse.OK(res, team.concat(restaurant.invited.map(email => ({email: email}))))
}))


module.exports = router
