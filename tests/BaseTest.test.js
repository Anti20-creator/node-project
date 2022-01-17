const express = require('express')
const app = require('../app/app')
const mongoose = require('mongoose')
const bodyparser = require('body-parser')

require('dotenv').config()
require('mocha')
const request = require('supertest')
const assert = require('assert')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout      = require('../models/LayoutModel')


async function registerEmployee(data) {

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
            await Layout.deleteMany({}).exec()
        })
    })


    it('Adding admin to database', async() => {
        await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók",
                password: "123456",
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

        await request(app)
            .post('/api/users/register-employee/' + restaurant._id)
            .set('Content-Type', 'application/json')
            .send({
                name: `Alkalmazott`,
                password: "asdadsa",
                email: `user@gmail.com`,
                secretPin: restaurant.secretPin
            })

        const employees = await User.countDocuments({isAdmin: false}).exec();
        assert.equal(employees, 1)

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

        const postData = [{
            coordinates: {
                x: 10,
                y: 10
            },
            tableCount: 4,
            tableType: 'round',
            direction: 0
        },{
            coordinates: {
                x: 0,
                y: 10
            },
            tableCount: 6,
            tableType: 'round',
            direction: 90
        },{
            coordinates: {
                x: 10,
                y: 0
            },
            tableCount: 4,
            tableType: 'round',
            direction: 0
        },{
            coordinates: {
                x: 5,
                y: 10
            },
            tableCount: 8,
            tableType: 'normal',
            direction: 0
        }]

        const response = await request(app)
            .post('/api/users/login')
            .set('Content-Type', 'application/json')
            .send({
                email: "owner@gmail.com",
                password: "123456"
            })

        const token = decodeURIComponent(response.header['set-cookie'][0].split(';')[0])

        await request(app)
            .post('/api/layouts/save')
            .set('Content-Type', 'application/json')
            .set('Cookie', token)
            .send({
                newTables: postData,
                removedTables: []
            })

        const tables = await Table.countDocuments({RestaurantId: restaurant._id}).exec()
        assert.equal(tables, postData.length)

        const tables2 = await Layout.findOne({RestaurantId: restaurant._id}).exec()
        assert.equal(tables2.tables.length, postData.length)
    })
})

/*after(async() => {
    await mongoose.connection.close()
})*/
