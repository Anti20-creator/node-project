const express = require('express')
const app = require('../app/app')
const mongoose = require('mongoose')
const { createServer } = require('http')
const { events } = require('../socket/events')
const { Server } = require('socket.io')
const request = require('supertest')
const { faker } = require('@faker-js/faker')

require('dotenv').config()
const assert = require('assert')
const jwt = require('jsonwebtoken')
const { userRouterTests } = require('./UserRouter')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout      = require('../models/LayoutModel')
const Menu        = require('../models/MenuModel')

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockReturnValue((mailoptions, callback) => {})
    })
}));

const createTables = () => {
    return Array.from(Array(faker.datatype.number({min: 3, max: 5}))).map(i => {
        return {
            coordinates: {
                x: faker.unique(() => faker.datatype.number({min: 0, max: 1000})),
                y: faker.unique(() => faker.datatype.number({min: 0, max: 1000}))
            },
            tableCount: faker.datatype.number({min: 1, max: 8}),
            tableType: faker.random.arrayElement(['round', 'normal']),
            size: faker.random.arrayElement(['small', 'normal', 'large']),
            direction: faker.random.arrayElement([0, 90, 108, 270]),
            localId: i
        }
    })
}

const foodIcons = [ 'Noodles', 'Bread', 'Steak', 'Cupcake', 'Fish Food' ]

class CookieStorage {
    cookieHeader = null

    save = (newHeader) => {
        this.cookieHeader = newHeader
    }

    get = () => {
        return this.cookieHeader
    }
}

beforeAll( async function() {

    httpServer = createServer();
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
    await Menu.deleteMany({}).exec()

    console.info('DB cleared up...')
})

describe('API tests', () => {
    const cookieStorage = new CookieStorage()
    describe('User router tests', () => {
        test('Registering one admin', async() => {
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

        test('Try to register admin with the same email', async() => {
            await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók hibás",
                password: "1234567",
                email: "owner@gmail.com",
                restaurantName: "Anti 2 Co."
            }).then((result) => {
                assert.equal(result.body.success, false)
            })

            const users = await User.countDocuments({}).exec();
            assert.equal(users, 1)
        })

        test('Inviting people to restaurant', async() => {

            const loginResult = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "owner@gmail.com",
                    password: "123456"
                })
            
            cookieStorage.save(loginResult.headers['set-cookie'])

            const newEmployeeCount = faker.datatype.number({min: 3, max: 6})

            for(let i = 0; i < newEmployeeCount; ++i) {

                const result = await request(app)
                    .post('/api/users/send-invite')
                    .set('Cookie', cookieStorage.get())
                    .set('Content-Type', 'application/json')
                    .send({
                        emailTo: `user${i+1}@gmail.com`
                    })

                assert.equal(result.status, 200)
            }

        })

        test('Trying to accept invite with wrong pin code', async() => {

            const restaurant = await Restaurant.findOne({
                ownerEmail: "owner@gmail.com"
            }).exec();


            const result = await request(app)
                    .post('/api/users/register-employee/' + restaurant._id)
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `Alkalmazott 1`,
                        password: "123456",
                        email: `user1@gmail.com`,
                        secretPin: restaurant.secretPin + "4"
                    })

            assert.equal(result.status, 400)

        })

        test('Registering people to restaurant', async() => {
            const restaurant = await Restaurant.findOne({
                ownerEmail: "owner@gmail.com"
            }).exec();

            const newEmployeeCount = restaurant.invited.length

            for(let i = 0; i < newEmployeeCount; ++i) {
                const result = await request(app)
                    .post('/api/users/register-employee/' + restaurant._id)
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `Alkalmazott ${i}`,
                        password: "123456",
                        email: `user${i+1}@gmail.com`,
                        secretPin: restaurant.secretPin
                    })

                assert.equal(result.status, 201)
            }

            const employees = await User.countDocuments({restaurantId: restaurant._id, isAdmin: false}).exec();
            assert.equal(employees, newEmployeeCount)
        })

        test('Try to accept the same invite twice', async() => {
            const restaurant = await Restaurant.findOne({
                ownerEmail: "owner@gmail.com"
            }).exec();

            const employeesBefore = await User.countDocuments({restaurantId: restaurant._id, isAdmin: false}).exec();

            const result = await request(app)
                .post('/api/users/register-employee/' + restaurant._id)
                .set('Content-Type', 'application/json')
                .send({
                    name: `Alkalmazott 1`,
                    password: "123456",
                    email: `user1@gmail.com`,
                    secretPin: restaurant.secretPin
                })

            assert.equal(result.status, 404)

            const employeesAfter = await User.countDocuments({restaurantId: restaurant._id, isAdmin: false}).exec();
            assert.equal(employeesBefore, employeesAfter)
        })

        test('Login normal user', async() => {

            const result = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "user1@gmail.com",
                    password: "123456"
                })

            assert.equal(result.status, 200)
        })

        test('Failed attempt to login normal user', async() => {

            const result = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "user1@gmail.com",
                    password: "1234567"
                })

            assert.equal(result.status, 401)
        })

        test('Login normal user and refresh the access token', async() => {

            const result = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "user1@gmail.com",
                    password: "123456"
                })

            assert.equal(result.status, 200)

            cookieStorage.save(result.headers['set-cookie'])

            const refreshed = await request(app)
                .post('/api/users/refresh-token')
                .set('Cookie', cookieStorage.get())
                .set('Content-Type', 'application/json')
            
            assert.equal(refreshed.status, 200)
        })

        test('Login normal user and refresh the access token', async() => {

            const result = await request(app)
                .post('/api/users/refresh-token')
                .set('Content-Type', 'application/json')
            
            assert.equal(result.status, 401)
        })
    })

    describe('Layout router tests', () => {

        test('Checking that only authorized users can access the route to the layout', async() => {
            
            const result = await request(app)
                .get('/api/layouts')
            
            assert.equal(result.status, 401)
            assert.equal(result.body.success, false)

        })

        test('Checking that layout exists on start', async() => {

            const loginResult = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "user1@gmail.com", password: "123456"
                })
            
            const result = await request(app)
                .get('/api/layouts')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')

            assert.equal(result.status, 200)
            assert.equal(result.body.message.length, 0)
            
        })

        test('Adding tables to the restaurant', async() => {

            const restaurant = await Restaurant.findOne({
                ownerEmail: "owner@gmail.com" 
            }).exec()

            const tables = createTables()
            
            const loginResult = await request(app)
                .post('/api/users/login')
                .send({
                    email: "owner@gmail.com", password: "123456"
                })
            
            const saveTablesResult = await request(app)
                .post('/api/layouts/save')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')
                .send({
                    newTables: tables,
                    updatedTables: [],
                    removedTables: []
                })
                
            assert.equal(saveTablesResult.status, 200)
            assert.equal(saveTablesResult.body.success, true)

            const DBtables = await Table.find({RestaurantId: restaurant._id}).exec()
            assert.equal(tables.length, DBtables.length)

            const newTables = createTables()

            const updateTablesResult = await request(app)
                .post('/api/layouts/save')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')
                .send({
                    newTables: newTables,
                    updatedTables: [],
                    removedTables: [faker.random.arrayElement(DBtables)]
                })

            const DBtablesUpdated = await Table.find({RestaurantId: restaurant._id}).exec()
            assert.equal(newTables.length + tables.length - 1, DBtablesUpdated.length)
            assert.equal(updateTablesResult.status, 200)
            assert.equal(updateTablesResult.body.success, true)
            
            const modifyTablesResult = await request(app)
                .post('/api/layouts/save')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')
                .send({
                    newTables: [],
                    updatedTables: createTables().map((table, idx) => {
                        return {
                            coordinates: table.coordinates,
                            databaseID: DBtablesUpdated[idx]
                        }
                    }),
                    removedTables: []
                })
            
            const DBtablesUpdated2 = await Table.find({RestaurantId: restaurant._id}).exec()
            assert.equal(DBtablesUpdated2.length, DBtablesUpdated.length)
            assert.equal(modifyTablesResult.status, 200)
            assert.equal(modifyTablesResult.body.success, true)
        })

        test('Normal user try to modify layout', async() => {
            
            const loginResult = await request(app)
                .post('/api/users/login')
                .send({
                    email: "user1@gmail.com", password: "123456"
                })
            
            assert.equal(loginResult.status, 200)
            assert.equal(loginResult.body.success, true)
            
            const saveTablesResult = await request(app)
                .post('/api/layouts/save')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')
                .send({
                    newTables: createTables(),
                    updatedTables: [],
                    removedTables: []
                })
            
            assert.equal(saveTablesResult.status, 401)
            assert.equal(saveTablesResult.body.success, false)
        })
    })

    describe('Menu router tests - constructing', () => {

        test('Try to access menu without logging in', async() => {

            const result = await request(app)
                .get('/api/menu')
                .set('Content-Type', 'application/json')
            
            assert.equal(result.status, 401)
            assert.equal(result.body.success, false)

        })

        test('Check if menu exists', async() => {

            const login = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "owner@gmail.com", password: "123456"
                })
            
            const result = await request(app)
                .get('/api/menu')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])

            assert.equal(result.status, 200)
            assert.equal(result.body.success, true)

        })

        test('Add category and item to menu', async() => {

            const login = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: "owner@gmail.com", password: "123456"
                })
    
            const category = faker.random.word()
            const result = await request(app)
                .post('/api/menu/add-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    category: category,
                    categoryIcon: faker.random.arrayElement(foodIcons)
                })
            
            assert.equal(result.status, 201)
            assert.equal(result.body.success, true)

            const itemName = faker.random.word()
            const itemResult = await request(app)
                .post('/api/menu/add-item')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    name: itemName, 
                    amount: 1, 
                    category: category, 
                    price: faker.datatype.number({min: 149, max: 399}) * 10, 
                    unit: 'db'
                })
            
            assert.equal(itemResult.status, 201)
            assert.equal(itemResult.body.success, true)
            
            const itemResult2 = await request(app)
                .put('/api/menu/modify-item')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    oldName: itemName, 
                    name: faker.random.word(),
                    amount: 2, 
                    category: category, 
                    price: faker.datatype.number({min: 149, max: 399}) * 10, 
                    unit: 'db'
                })
            
            assert.equal(itemResult2.status, 200)
            assert.equal(itemResult2.body.success, true)

            const newCategory = 'New ' + faker.random.word()
            const modifyCategoryResult = await request(app)
                .post('/api/menu/modify-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    oldCategory: category,
                    category: newCategory
                })

            assert.equal(modifyCategoryResult.status, 200)
            assert.equal(modifyCategoryResult.body.success, true)

            const modifyBadCategoryResult = await request(app)
                .post('/api/menu/modify-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    oldCategory: 'asdhakjsd',
                    category: faker.random.word()
                })

            assert.equal(modifyBadCategoryResult.status, 404)
            assert.equal(modifyBadCategoryResult.body.success, false)
            
            const modifyEmptyCategoryResult = await request(app)
                .post('/api/menu/modify-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])

            assert.equal(modifyEmptyCategoryResult.status, 400)
            assert.equal(modifyEmptyCategoryResult.body.success, false)
        })
    })

    describe('Table router tests', () => {

        test('Try to book a table without permission', async() => {

            await request(app)
                .post('/api/tables/book')
                .then(result => {
                    assert.equal(result.status, 401)
                    assert.equal(result.body.success, false)
                })
                
        })

        test('Book a table and try to book again', async() => {

            const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()

            const tables = await Table.find({RestaurantId: restaurant._id}).exec()

            const tableId = faker.random.arrayElement(tables)

            await request(app)
                .post('/api/users/login')
                .send({email: "user2@gmail.com", password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .post('/api/tables/book')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                })
            
            await request(app)
                .post('/api/users/login')
                .send({email: "user1@gmail.com", password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .post('/api/tables/book')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId
                        })
                        .then(result => {
                            assert.equal(result.status, 409)
                            assert.equal(result.body.success, false)
                        })
                    
                    await request(app)
                        .post('/api/tables/free-table')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId})
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                })
            
        })

        test('Book table and order food', async() => {

            const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()

            const tables = await Table.find({RestaurantId: restaurant._id}).exec()
            const menu = await Menu.findOne({RestaurantId: restaurant._id}).exec()

            const itemCategory = Object.keys(menu.items)[0]
            const itemName = Object.keys(menu.items[itemCategory])[0]

            const table = faker.random.arrayElement(tables)
            
            await request(app)
                .post('/api/users/login')
                .send({email: "owner@gmail.com", password: "123456"})
                .then(async loginResult => {

                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id, item: {
                            name: itemName,
                            category: itemCategory,
                            quantity: 1
                        }})
                        .then(result => {
                            assert.equal(result.status, 400)
                            assert.equal(result.body.success, false)
                        })

                })

            await request(app)
                .post('/api/users/login')
                .send({email: "owner@gmail.com", password: "123456"})
                .then(async loginResult => {

                    await request(app)
                        .post('/api/tables/book')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id})
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })

                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id, item: {
                            name: itemName,
                            category: itemCategory,
                            quantity: 1
                        }})
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })

                    await request(app)
                        .post('/api/tables/increase-order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id,
                            name: itemName
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })

                    await request(app)
                        .post('/api/tables/decrease-order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id,
                            name: itemName
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                    
                    
                    await request(app)
                        .get('/api/tables/orders/' + table._id)
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                            assert.equal(result.body.message.length, 1)
                            assert.equal(result.body.message[0].name, itemName)
                        })

                    await request(app)
                        .delete('/api/tables/remove-order/')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id, name: itemName})
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })

                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id, item: {
                            name: itemName,
                            category: itemCategory,
                            quantity: 1
                        }})
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })
                    
                    await request(app)
                        .get('/api/tables/' + table._id)
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })
                })

        })

    })

    describe('Appointment router tests', () => {
        
        test('Book an appointment for past and over 2 month limit', async() => {
            
            const past = new Date().setTime(new Date().getTime() - 24 * 3600 * 1000)
            const future = new Date().setTime(new Date().getTime() + 80 * 24 * 3600 * 1000)

            const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()
            const tables     = await Table.find({RestaurantId: restaurant._id}).exec()
            
            const table = faker.random.arrayElement(tables)

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: past,
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: future,
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

        })


        test('Book an appointment', async() => {
            
            const date = new Date().setTime(new Date().getTime() + 24 * 3600 * 1000)
            const secondDate = new Date().setTime(new Date().getTime() + 48 * 3600 * 1000)

            const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()
            const tables     = await Table.find({RestaurantId: restaurant._id}).exec()
            
            const table = faker.random.arrayElement(tables)

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id + '1',
                    date: date,
                    peopleCount: table.tableCount,
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: date,
                    peopleCount: table.tableCount + 1,
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: date,
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 201)
                    assert.equal(result.body.success, true)
                })

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: date,
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: secondDate,
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com"
                })
                .then(result => {
                    assert.equal(result.status, 201)
                    assert.equal(result.body.success, true)
                })
        })

        test('Disclaiming appointment', async() => {

            const appointment = await Appointment.findOne({}).exec()

            await request(app)
                .delete('/api/appointments/disclaim')
                .send({
                    tableId: appointment.TableId + '1',
                    restaurantId: appointment.RestaurantId,
                    date: appointment.date,
                    pin: appointment.code
                })
                .then(result => {
                    assert.equal(result.status, 404)
                    assert.equal(result.body.success, false)
                })

            await request(app)
                .delete('/api/appointments/disclaim')
                .send({
                    tableId: appointment.TableId,
                    restaurantId: appointment.RestaurantId,
                    date: appointment.date,
                    pin: appointment.code + '1'
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            await request(app)
                .delete('/api/appointments/disclaim')
                .send({
                    tableId: appointment.TableId,
                    restaurantId: appointment.RestaurantId,
                    date: appointment.date,
                    pin: appointment.code
                })
                .then(result => {
                    assert.equal(result.status, 200)
                    assert.equal(result.body.success, true)
                })
        })

        test('User removing appointment', async() => {

            const appointment = await Appointment.findOne({}).exec()

            await request(app)
                .post('/api/users/login/')
                .send({email: "user2@gmail.com", password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .delete('/api/appointments/delete-appointment/' + appointment._id)
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                })
        })

        test('Find tables', async() => {

            await request(app)
                .post('/api/users/login/')
                .send({email: "user2@gmail.com", password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .post('/api/appointments/find-tables')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            email: "guest@gmail.com",
                            date: new Date().setTime(new Date().getTime() + 24 * 3600 * 1000),
                            peopleCount: 1
                        })
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })
                })
        })
    })

    describe('Menu router tests - delete item and category', () => {

        test('Delete item and category', async() => {

            const restaurant = await Restaurant.findOne({ownerEmail: "owner@gmail.com"}).exec()
            const menu = await Menu.findOne({RestaurantId: restaurant._id}).exec()
            
            const itemCategory = Object.keys(menu.items)[0]
            const itemName = Object.keys(menu.items[itemCategory])[0]

            await request(app)
                .post('/api/users/login/')
                .send({email: "user1@gmail.com", password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .delete('/api/menu/delete-item')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            name: itemName,
                            category: itemCategory
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })

                    await request(app)
                        .delete('/api/menu/delete-category')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            category: itemCategory
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                })

            const menuAfter = await Menu.findOne({RestaurantId: restaurant._id}).exec()
            assert.equal(Object.keys(menuAfter.items).length, 0)
            assert.equal(Object.keys(menuAfter.icons).length, 0)
        })

    })


})

afterAll(async () => {
    console.log('Closing connection...')
    await mongoose.connection.close()
    await httpServer.close()
    io.close()
})
