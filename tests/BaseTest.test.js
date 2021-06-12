const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyparser = require('body-parser')
const users = require('../routes/users')
require('dotenv').config()
require('mocha')
app.use(bodyparser.json())
const request = require('supertest')
const assert = require('assert')
const UserModel   = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
app.use('/api/users', users)

describe('Basic API testing', () => {
    let restaurantId = null
    let secretPin = null
    //creating the server connection before test cases
    before(async function() {
        console.log(process.env.MONGODB_URI)
        const connected = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        }).then(async() => {
            const req = await UserModel.deleteMany()
                .then(async() => {
                    const req2 = await Restaurant.deleteMany()
                })
        })
    })


    it('Adding admin to database', async() => {
        console.log('Adding admin')
        const result = await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók",
                password: "jelsasdsd",
                email: "owner@gmail.com",
                restaurantName: "Anti Co."
            })

        assert.equal(result.body.success, true)
        assert.equal(true, true)
    })

    it('Adding employees to the restaurant', async() => {
        console.log('Adding employees')

        const wait = await Restaurant.findOne({}, {}, {}, (err, data) => {
            console.log('FOUND:', data)
            restaurantId = data._id
            secretPin = data.secretPin
        })

        const result = await request(app)
            .post('/api/users/register-employee/' + restaurantId)
            .set('Content-Type', 'application/json')
            .send({
                name: "Alkalmazott",
                password: "asdadsa",
                email: "user@gmail.com",
                secretPin: secretPin
            }).then(async (gettedData) => {
                assert.equal(gettedData.body.success, true)
                const result2 = await request(app)
                    .post('/api/users/register-employee/' + restaurantId)
                    .set('Content-Type', 'application/json')
                    .send({
                        name: "Alkalmazott2",
                        password: "asdadsa",
                        email: "user2@gmail.com",
                        secretPin: secretPin
                    }).then(async (data) => {
                        if(!data.body.success){
                            console.log(data.body.message)
                        }
                        assert.equal(data.body.success, true)
                        const wait2 = await Restaurant.findOne({}, {}, {}, (err, data) => {
                            console.log(data.employees)
                            assert.equal(data.employees.length, 2)
                        })
                    })
            })

    })

    it('Sending test emails', async() => {

        const result = await request(app)
            .post('/api/users/send-invite')
            .send({
                ownerEmail: 'owner@gmail.com',
                emailTo: 'amtmannkristof@gmail.com'
            }).then(result => {
                assert.equal(result.body.success, true)
            })
    })
})

/*after(async() => {
    await mongoose.connection.close()
})*/
