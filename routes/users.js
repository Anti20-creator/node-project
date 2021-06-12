const mongoose    = require('mongoose')
const express     = require('express')
const router      = express.Router()
const UserModel   = require('../models/UserModel')

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

router.post('/register-employee/:id', (req, res) => {
    const {name, email, password, secretPin} = req.body

    const restaurantId = req.params.id
    let restaurantName = null

    const restaurant = UserModel.findById(restaurantId)

    if(!restaurant){
        res.status(400).send({
            success: false,
            message: "Restaurant doesn't exist with the given id."
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
        })
            /*.catch((err) => {
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
        })*/

        /*res.send({
            success: false,
            message: "User not created!"
        })*/
    }

})

module.exports = router