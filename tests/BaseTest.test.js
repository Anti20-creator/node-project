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
    //creating the server connection before test cases
    before(async function() {
        console.log(process.env.MONGODB_URI)
        const connected = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        })

        const req = await UserModel.deleteMany()
        const req2 = await Restaurant.deleteMany()

        console.log(connected.models)
    })


    it('Adding user to database', async() => {
        console.log('Start adding...')
        const result = await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók",
                password: "jelsasdsd",
                email: "test3@gmail.com",
                restaurantName: "Anti Co."
            })

        assert.equal(result.body.success, true)
        assert.equal(true, true)
    })
})

/*after(async() => {
    await mongoose.connection.close()
})*/
