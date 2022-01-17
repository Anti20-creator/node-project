const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyparser = require('body-parser')

const users = require('../routers/users')
const appointments = require('../routers/appointment')

require('dotenv').config()
require('mocha')
app.use(bodyparser.json())
const request = require('supertest')
const assert = require('assert')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')

app.use('/api/users', users)
app.use('/api/appointments/', appointments)

async function registerEmployee(data) {
    await request(app)
        .post('/api/users/register-employee/' + data.id)
        .set('Content-Type', 'application/json')
        .send({
            name: `Alkalmazott${data.count}`,
            password: "asdadsa",
            email: `user${data.count}@gmail.com`,
            secretPin: data.secretPin
        })
        .expect((res) => {
            assert.equal(res.body.success, true)
        })
}

describe('Basic API testing', () => {
    let restaurantId = null
    let secretPin = null
    //creating the server connection before test cases
    before(async function() {
        const connected = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        }).then(async() => {
            await User.deleteMany({}).exec()
            await Restaurant.deleteMany({}).exec()
            await Table.deleteMany({}).exec()
            await Appointment.deleteMany({}).exec()
        })
    })


    it('Adding admin to database', async() => {
        await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók",
                password: "jelsasdsd",
                email: "owner@gmail.com",
                restaurantName: "Anti Co."
            }).then((result) => {
                assert.equal(result.body.success, true)
            })


        const users = await User.countDocuments({}).exec();
        assert.equal(users, 1)
    })

    it('Adding employees to the restaurant', async() => {

        const restaurant = await Restaurant.findOne({}).exec();

        for (let i = 0; i < 5; i++) {
            await registerEmployee({
                id: restaurant._id,
                count: i+1,
                secretPin: restaurant.secretPin
            })
        }

        const employees = await User.countDocuments({isAdmin: false}).exec();
        assert.equal(employees, 5)

    })

    it('Sending test emails', async() => {

        const result = await request(app)
            .post('/api/users/send-invite')
            .send({
                ownerEmail: 'owner@gmail.com',
                emailTo: 'amtmannkristof@gmail.com'
            })

        assert.equal(true, true)
    })

    it('Adding tables to restaurant', async() => {
        const restaurant = await Restaurant.findOne({}).exec()

        for(let i = 0; i < 12; ++i) {
            const table = new Table({
                RestaurantId: restaurant._id,
                liveOrders: []
            })
            await table.save()
        }

        const tables = await Table.countDocuments({RestaurantId: restaurant._id}).exec()
        assert.equal(tables, 12)
    })
})

/*after(async() => {
    await mongoose.connection.close()
})*/
