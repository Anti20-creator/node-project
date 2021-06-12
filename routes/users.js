const mongoose    = require('mongoose')
const express     = require('express')
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
    console.log('ID:', restaurantId)
    let restaurantName = null
    let restaurantsPin = null

    const restaurant = await Restaurant.findById(restaurantId,function (err, data)  {
        console.log('FINDBYID:', data)
        restaurantsPin = data.secretPin
    })

    if(!restaurant){
        res.status(400).send({
            success: false,
            message: "Restaurant doesn't exist with the given id."
        })
    }else if(restaurantsPin != secretPin){
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
                    console.log(err)
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
            if(err){

            }
        })

        /*res.send({
            success: false,
            message: "User not created!"
        })*/
    }

})

module.exports = router