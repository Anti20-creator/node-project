const express = require('express')
const app = require('../app/app')
const mongoose = require('mongoose')
const bodyparser = require('body-parser')
const { faker } = require('@faker-js/faker')
const { createServer } = require('http')
const { events } = require('../socket/events')
const { Server } = require('socket.io')

require('dotenv').config()
require('mocha')
const request = require('supertest')
const assert = require('assert')
const jwt = require('jsonwebtoken')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout      = require('../models/LayoutModel')


class CookieStorage {
    cookieHeader = null

    save = (newHeader) => {
        this.cookieHeader = newHeader
    }

    get = () => {
        return this.cookieHeader
    }
}



describe('Testcases', () => {
    const cookieStorage = new CookieStorage()

    /*beforeEach( async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("----------------------");
    });*/
    //creating the server connection before test cases
    before( async function() {
        let io, serverSocket, clientSocket;

        const httpServer = createServer();
        io = new Server(httpServer);
        httpServer.listen(() => {
            events(io)
            app.set('socketio', io)
        })
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        })
        await User.deleteMany({}).exec()
        await Restaurant.deleteMany({}).exec()
        await Table.deleteMany({}).exec()
        await Appointment.deleteMany({}).exec()
        await Layout.deleteMany({}).exec()

        console.info('DB cleared up...')
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

    it('Searching the only and one user and restaurant', async() => {

        const user = await User.findOne({email: "owner@gmail.com"}).exec()
        const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()

        assert.notEqual(user, null)
        assert.notEqual(restaurant, null)
    })

    it('Adding employee to the restaurant', async() => {

        const restaurant = await Restaurant.findOne({}).exec();

        await request(app)
            .post('/api/users/register-employee/' + restaurant._id)
            .set('Content-Type', 'application/json')
            .send({
                name: `Alkalmazott`,
                password: "123456",
                email: `user@gmail.com`,
                secretPin: restaurant.secretPin
            })

        const employees = await User.countDocuments({isAdmin: false}).exec();
        assert.equal(employees, 1)

    })

    it('Logging user in', async() => {
        const response = await request(app)
            .post('/api/users/login')
            .set('Content-Type', 'application/json')
            .send({
                email: "owner@gmail.com",
                password: "123456"
            })

        cookieStorage.save(response.headers['set-cookie'])

        assert.equal(response.status, 200)
    })

    it('Sending test emails', async() => {

        const result = await request(app)
            .post('/api/users/send-invite')
            .send({
                ownerEmail: 'owner@gmail.com',
                emailTo: 'amtmannkristof@gmail.com'
            })
    })

    it('Checking that layout exists after creating restaurant', async () => {

        const result = await request(app)
            .get('/api/layouts')
            .set('Content-Type', 'application/json')
            .set('Cookie', cookieStorage.get())
        
        assert.equal(result.body.success, true)
        assert.equal(result.body.message.length, 0)
    })

    it('Adding tables to restaurant', async() => {
        const restaurant = await Restaurant.findOne({}).exec()

        const postData = [{
            coordinates: {
                x: 10,
                y: 10
            },
            tableCount: 4,
            size: 'normal',
            tableType: 'round',
            direction: 0,
            localId: 0
        },{
            coordinates: {
                x: 0,
                y: 10
            },
            tableCount: 6,
            tableType: 'round',
            direction: 90,
            localId: 1
        },{
            coordinates: {
                x: 10,
                y: 0
            },
            tableCount: 4,
            tableType: 'round',
            direction: 0,
            localId: 2
        },{
            coordinates: {
                x: 5,
                y: 10
            },
            tableCount: 8,
            tableType: 'normal',
            direction: 0,
            localId: 3
        }]

        await request(app)
            .post('/api/layouts/save')
            .set('Content-Type', 'application/json')
            .set('Cookie', cookieStorage.get())
            .send({
                newTables: postData,
                removedTables: [],
        		updatedTables: []
            })

        const tables = await Table.countDocuments({RestaurantId: restaurant._id}).exec()
        assert.equal(tables, postData.length)

        const tables2 = await Layout.findOne({RestaurantId: restaurant._id}).exec()
        assert.equal(tables2.tables.length, postData.length)
    })

    it('Booking a table', async() => {

        const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()

        const tables = await Table.find({RestaurantId: restaurant._id}).exec()
        const table = faker.random.arrayElement(tables)

        const result = await request(app)
            .post('/api/appointments/book')
            .set('Content-Type', 'application/json')
            .send({
                email: "amtmannkristof@gmail.com",
                date: new Date(),
                restaurantId: restaurant._id,
                tableId: table._id,
                peopleCount: 1
            })
        
        console.log(result.body)
        assert.equal(result.status, 200)

        const appointmentsCount = await Appointment.countDocuments().exec()
        assert.equal(appointmentsCount, 1)
    })
})

/*after(async() => {
    await mongoose.connection.close()
})*/
