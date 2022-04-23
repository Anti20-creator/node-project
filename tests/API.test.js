const app = require('../app/app')
const mongoose = require('mongoose')
const { createServer } = require('http')
const { events } = require('../socket/events')
const { Server } = require('socket.io')
const request = require('supertest')
const { faker } = require('@faker-js/faker')

require('dotenv').config()
const assert = require('assert')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout      = require('../models/LayoutModel')
const Menu        = require('../models/MenuModel')
const Information = require('../models/InformationsModel')

jest.setTimeout(20000)
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockReturnValue((mailoptions, callback) => {})
    })
}));

function getNextGivenDay(day, date = new Date()) {
    const dateCopy = new Date(new Date(date.getTime()) + 3_600_000 * 48)
    
    const nextDay = new Date(
      dateCopy.setUTCDate(
        dateCopy.getDate() + ((7 - dateCopy.getDay() + day) % 7 || 7)
      )
    )
  
    return nextDay;
}

const getRandomDate = (from, to) => {
    from = from.getTime()
    to = to.getTime()
    return new Date(from + Math.random() * (to - from));
}

const createTables = (startIndex = 0) => {
    return Array.from(Array(faker.datatype.number({min: 3, max: 5}))).map((_, i) => {
        return {
            coordinates: {
                x: faker.unique(() => faker.datatype.number({min: 0, max: 800})),
                y: faker.unique(() => faker.datatype.number({min: 0, max: 800}))
            },
            tableCount: faker.datatype.number({min: 1, max: 8}),
            tableType: faker.random.arrayElement(['rounded', 'normal', 'wide']),
            size: faker.random.arrayElement(['small', 'average', 'large']),
            direction: faker.random.arrayElement([0, 90, 180, 270]),
            localId: i + startIndex
        }
    })
}

const foodIcons = [ 'Noodles', 'Bread', 'Steak', 'Cupcake', 'Fish Food' ]

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
    await Information.deleteMany({}).exec()

    console.info('DB cleared up...')
})

const adminEmail = faker.unique(() => faker.internet.email())
let userEmails = Array.from(Array(faker.datatype.number({min: 3, max: 6}))).map((_, i) => faker.unique(() => faker.internet.email()))
const soonPromoted = faker.random.arrayElement(userEmails)
const deletedUser = faker.random.arrayElement(userEmails.filter(email => email !== soonPromoted))

describe('API tests', () => {

    describe('User router tests', () => {
        
        test('Registering without all required informations', async() => {
            await request(app)
                .post('/api/users/register-admin')
                .set('Content-Type', 'application/json')
                .send({
                    name: "Teszt fiók - hibás",
                    password: "123456",
                    email: adminEmail,
                    lang: 'en'
                }).then((result) => {
                    assert.equal(result.body.success, false)
                    assert.equal(result.status, 400)
                })

            const users = await User.countDocuments({}).exec();
            assert.equal(users, 0)
        })

        test('Registering one admin', async() => {
            await request(app)
            .post('/api/users/register-admin')
            .set('Content-Type', 'application/json')
            .send({
                name: "Teszt fiók",
                password: "123456",
                email: adminEmail,
                restaurantName: "Anti Co.",
                lang: 'en'
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
                email: adminEmail,
                restaurantName: "Anti 2 Co.",
                lang: 'en'
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
                    email: adminEmail,
                    password: "123456"
                })
            
            for(let i = 0; i < userEmails.length; ++i) {

                const result = await request(app)
                    .post('/api/users/send-invite')
                    .set('Cookie', loginResult.headers['set-cookie'])
                    .set('Content-Type', 'application/json')
                    .send({
                        emailTo: userEmails[i],
                        lang: 'en'
                    })
                
                assert.equal(result.status, 200)
            }

        })

        test('Trying to accept invite with wrong pin code', async() => {

            const restaurant = await Restaurant.findOne({
                ownerEmail: adminEmail
            }).exec();


            const result = await request(app)
                    .post('/api/users/register-employee/' + restaurant._id)
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `Alkalmazott 1`,
                        password: "123456",
                        email: userEmails[0],
                        secretPin: restaurant.secretPin + "4",
                        lang: 'en'
                    })

            assert.equal(result.status, 400)

        })

        test('Registering people to restaurant', async() => {
            const restaurant = await Restaurant.findOne({
                ownerEmail: adminEmail
            }).exec();

            for(let i = 0; i < userEmails.length; ++i) {
                const result = await request(app)
                    .post('/api/users/register-employee/' + restaurant._id)
                    .set('Content-Type', 'application/json')
                    .send({
                        name: `Alkalmazott ${i}`,
                        password: "123456",
                        email: userEmails[i],
                        secretPin: restaurant.secretPin,
                        lang: 'en'
                    })

                assert.equal(result.status, 201)
            }

            const employees = await User.countDocuments({restaurantId: restaurant._id, isAdmin: false}).exec();
            assert.equal(employees, userEmails.length)
        })

        test('Try to accept the same invite twice', async() => {
            const restaurant = await Restaurant.findOne({
                ownerEmail: adminEmail
            }).exec();

            const employeesBefore = await User.countDocuments({restaurantId: restaurant._id, isAdmin: false}).exec();

            const result = await request(app)
                .post('/api/users/register-employee/' + restaurant._id)
                .set('Content-Type', 'application/json')
                .send({
                    name: `Alkalmazott 1`,
                    password: "123456",
                    email: faker.random.arrayElement(userEmails),
                    secretPin: restaurant.secretPin,
                    lang: 'en'
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
                    email: faker.random.arrayElement(userEmails),
                    password: "123456"
                })

            assert.equal(result.status, 200)
        })

        test('Failed attempt to login normal user', async() => {

            const result = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: faker.random.arrayElement(userEmails),
                    password: "1234567" //wrong password
                })

            assert.equal(result.status, 401)
        })

        test('Login normal user and refresh the access token', async() => {

            const result = await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({
                    email: faker.random.arrayElement(userEmails),
                    password: "123456"
                })

            assert.equal(result.status, 200)

            const refreshed = await request(app)
                .post('/api/users/refresh-token')
                .set('Cookie', result.headers['set-cookie'])
                .set('Content-Type', 'application/json')
            
            assert.equal(refreshed.status, 200)
        })

        test('Refresh the access token without headers', async() => {

            const result = await request(app)
                .post('/api/users/refresh-token')
                .set('Content-Type', 'application/json')
            
            assert.equal(result.status, 401)
        })
            
        test('GET isadmin', async() => {
        
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginData => {
                    const result = await request(app)
                        .get('/api/users/is-admin')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                    
                    assert.equal(result.status, 200)
                    assert.equal(result.body.message, true)
                })
            
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                .then(async loginData => {
                    const result = await request(app)
                        .get('/api/users/is-admin')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                    
                        assert.equal(result.status, 200)
                        assert.equal(result.body.message, false)
                    })
            
            const result = await request(app)
                .get('/api/users/is-admin')
                .set('Content-Type', 'application/json')
            
            assert.equal(result.status, 401)
        })

        test('Logout functionality', async() => {
        
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginData => {
                    const result = await request(app)
                        .get('/api/users/logout')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                    
                    assert.equal(result.status, 200)
                    
                    
                    const loggedOutRequest = await request(app)
                        .get('/api/users/is-admin')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', result.headers['set-cookie'])
                    
                    assert.equal(loggedOutRequest.status, 401)
                })
        })

        test('Update rank', async() => {
        
            let adminUsers = await User.countDocuments({isAdmin: true}).exec()
            assert.equal(adminUsers, 1)

            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginData => {

                    //Rank up user
                    await request(app)
                        .post('/api/users/update-rank')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({
                            promote: true, email: soonPromoted
                        }).then(async result => {
                            assert.equal(result.status, 200)

                            adminUsers = await User.countDocuments({isAdmin: true}).exec()
                            assert.equal(adminUsers, 2)
                        })
                        
                    //Try to down rank owner as owner
                    await request(app)
                        .post('/api/users/update-rank')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({
                            promote: false, email: adminEmail
                        }).then(async result => {
                            assert.equal(result.status, 400)
                            
                            adminUsers = await User.countDocuments({isAdmin: true}).exec()
                            assert.equal(adminUsers, 2)
                        })
                    
                    //Rank down other user
                    await request(app)
                        .post('/api/users/update-rank')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({
                            promote: false, email: soonPromoted
                        }).then(async result => {
                            assert.equal(result.status, 200)

                            adminUsers = await User.countDocuments({isAdmin: true}).exec()
                            assert.equal(adminUsers, 1)
                        })

                    //Rank up user again
                    await request(app)
                        .post('/api/users/update-rank')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({
                            promote: true, email: soonPromoted
                        }).then(async result => {
                            assert.equal(result.status, 200)

                            adminUsers = await User.countDocuments({isAdmin: true}).exec()
                            assert.equal(adminUsers, 2)
                            userEmails = userEmails.filter(email => email !== soonPromoted)
                        })
                })

            //Try to down rank owner as other admin
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: soonPromoted, password: "123456"})
                .then(async loginData => {
                    await request(app)
                        .post('/api/users/update-rank')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({
                            promote: false, email: adminEmail
                        }).then(async result => {
                            assert.equal(result.status, 400)
                            
                            adminUsers = await User.countDocuments({isAdmin: true}).exec()
                            assert.equal(adminUsers, 2)
                        })
                    })
            
            //Try to down rank user without access token
            await request(app)
                .post('/api/users/update-rank')
                .set('Content-Type', 'application/json')
                .send({
                    promote: false, email: adminEmail
                }).then(async result => {
                    assert.equal(result.status, 401)
                    adminUsers = await User.countDocuments({isAdmin: true}).exec()
                    assert.equal(adminUsers, 2)
                })
        })

        test('Delete user', async() => {

            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginData => {

                    //Trying to delete own account
                    await request(app)
                        .delete('/api/users/delete')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({email: adminEmail})
                        .then(result => {
                            assert.equal(result.status, 400)
                        })

                    //Remove other user
                    await request(app)
                        .delete('/api/users/delete')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({email: deletedUser})
                        .then(result => {
                            console.warn(result.body)
                            assert.equal(result.status, 200)
                        })
                    
                    userEmails = userEmails.filter(email => email !== deletedUser)
                })
            
            //Try to remove user without access token
            await request(app)
                .delete('/api/users/delete')
                .set('Content-Type', 'application/json')
                .send({email: faker.random.arrayElement(userEmails)})
                .then(result => {
                    assert.equal(result.status, 401)
                })
        })

        test('Get team', async() => {
            
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .get('/api/users/team')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.message.length, userEmails.length + 2)
                        })
                })

            //Try to read team without access token
            await request(app)
                .get('/api/users/team')
                .set('Content-Type', 'application/json')
                .then(result => {
                    assert.equal(result.status, 401)
                })

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
                    email: faker.random.arrayElement(userEmails), password: "123456"
                })
            
            const result = await request(app)
                .get('/api/layouts')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')

            assert.equal(result.status, 200)
            assert.equal(result.body.message.length, 0)
            
        })

        test('Adding tables to the restaurant', async() => {

            const restaurant = await Restaurant.findOne({ownerEmail: adminEmail}).exec()

            const tables = createTables()
            
            const loginResult = await request(app)
                .post('/api/users/login')
                .send({
                    email: adminEmail, password: "123456"
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

            const newTables = createTables(tables.length)

            const updateTablesResult = await request(app)
                .post('/api/layouts/save')
                .set('Cookie', loginResult.headers['set-cookie'])
                .set('Content-Type', 'application/json')
                .send({
                    newTables: newTables,
                    updatedTables: [],
                    removedTables: [faker.random.arrayElement(DBtables)['_id']]
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
        
            let normalUser = faker.random.arrayElement(userEmails)

            const loginResult = await request(app)
                .post('/api/users/login')
                .send({
                    email: normalUser, password: "123456"
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

        test('Get layout as guest', async () => {

            const restaurant = await Restaurant.findOne({}).exec()

            await request(app)
                .get('/api/layouts/' + restaurant._id)
                .set('Content-Type', 'application/json')
                .then(response => {
                    assert.equal(response.status, 200)
                    assert.equal(response.body.message.length > 0, true)
                }) 
        })
        
        test('Update image', async () => {

            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginData => {
                    await request(app)
                        .get('/api/layouts/data')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .then(response => {
                            assert.equal(response.status, 200)
                            //assert.equal(response.body.message.sizeX, 1000)
                        }) 

                })

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
                    email: adminEmail, password: "123456"
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
                    email: adminEmail, password: "123456"
                })

            const category = faker.random.word()
            const categoryIcon = faker.random.arrayElement(foodIcons)

            //Try to add category with few informations
            await request(app)
                .post('/api/menu/add-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    category: category,
                }).then(result => {
                    assert.equal(result.status, 400)
                })

            //Creating new category
            const result = await request(app)
                .post('/api/menu/add-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    category: category,
                    categoryIcon: categoryIcon 
                })
            
            assert.equal(result.status, 201)
            assert.equal(result.body.success, true)

            //Add new item
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
            
            //Modifying previously created item
            const itemResult2 = await request(app)
                .post('/api/menu/modify-item')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    oldName: itemName, 
                    name: faker.random.word(),
                    amount: 1, 
                    category: category, 
                    price: faker.datatype.number({min: 149, max: 399}) * 10, 
                    unit: 'db'
                })
            
            assert.equal(itemResult2.status, 200)
            assert.equal(itemResult2.body.success, true)

            //Modifying category
            const newCategory = 'New ' + faker.random.word()
            const modifyCategoryResult = await request(app)
                .post('/api/menu/modify-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    category: newCategory,
                    oldCategory: category,
                    categoryIcon: categoryIcon
                })
            assert.equal(modifyCategoryResult.status, 200)
            assert.equal(modifyCategoryResult.body.success, true)

            //Try to modify unexisting category
            const modifyBadCategoryResult = await request(app)
                .post('/api/menu/modify-category')
                .set('Content-Type', 'application/json')
                .set('Cookie', login.headers['set-cookie'])
                .send({
                    category: faker.random.word(),
                    oldCategory: 'asdhakjsd',
                    categoryIcon: categoryIcon
                })
            assert.equal(modifyBadCategoryResult.status, 404)
            assert.equal(modifyBadCategoryResult.body.success, false)
            
            //Try to modify category without posted data
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

            const restaurant = await Restaurant.findOne({ownerEmail: adminEmail}).exec()
            const tables = await Table.find({RestaurantId: restaurant._id}).exec()
            const tableId = faker.random.arrayElement(tables)._id

            await request(app)
                .post('/api/users/login')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
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
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                .then(async loginResult => {

                    //Booked twice
                    await request(app)
                        .post('/api/tables/book')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId
                        })
                        .then(result => {
                            assert.equal(result.status, 400)
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

            const restaurant = await Restaurant.findOne({ownerEmail: adminEmail}).exec()

            const tables = await Table.find({RestaurantId: restaurant._id}).exec()
            const menu = await Menu.findOne({RestaurantId: restaurant._id}).exec()

            const itemCategory = Object.keys(menu.items)[0]
            const itemName = Object.keys(menu.items[itemCategory])[0]

            const table = faker.random.arrayElement(tables)
            
            await request(app)
                .post('/api/users/login')
                .send({email: adminEmail, password: "123456"})
                .then(async loginResult => {

                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id, 
                            item: {
                                name: itemName,
                                category: itemCategory,
                                quantity: 1
                            },
                            socketId: 'my-socket-id'
                        })
                        .then(result => {
                            assert.equal(result.status, 400)
                            assert.equal(result.body.success, false)
                        })

                })

            await request(app)
                .post('/api/users/login')
                .send({email: adminEmail, password: "123456"})
                .then(async loginResult => {

                    //Book the table
                    await request(app)
                        .post('/api/tables/book')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id})
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })

                    //Try to book it again
                    await request(app)
                        .post('/api/tables/book')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 400)
                            assert.equal(result.body.success, false)
                        })

                    //Try to add non existing food
                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id, 
                            item: {
                                name: itemName + 'nem letezo',
                                category: itemCategory,
                                quantity: 1
                            },
                            socketId: 'my-socket-id'
                        })
                        .then(result => {
                            assert.equal(result.status, 400)
                            assert.equal(result.body.success, false)
                        })
                    
                    //Add order to table
                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id, 
                            item: {
                                name: itemName,
                                category: itemCategory,
                                quantity: 1
                            },
                            socketId: 'my-socket-id'
                        })
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })
                    
                    //Try to free table with orders
                    await request(app)
                        .post('/api/tables/free-table')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id})
                        .then(result => {
                            assert.equal(result.status, 400)
                            assert.equal(result.body.success, false)
                        })
                    
                    //Increase order quantity
                    await request(app)
                        .post('/api/tables/increase-order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id,
                            name: itemName,
                            socketId: 'my-socket-id'
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                    
                    //Decrease order quantity
                    await request(app)
                        .post('/api/tables/decrease-order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id,
                            name: itemName,
                            socketId: 'my-socket-id'
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                    
                    //Get orders from table
                    await request(app)
                        .get('/api/tables/orders/' + table._id)
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                            assert.equal(result.body.message.length, 1)
                            assert.equal(result.body.message[0].name, itemName)
                        })

                    //Remove order from table
                    await request(app)
                        .delete('/api/tables/remove-order/')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({tableId: table._id, name: itemName, socketId: 'my-socket-id'})
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })

                    //Order food again
                    await request(app)
                        .post('/api/tables/order')
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            tableId: table._id, 
                            item: {
                                name: itemName,
                                category: itemCategory,
                                quantity: 1
                            }, 
                            socketId: 'my-socket-id'
                        })
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })
                    
                    //Generate invoice
                    await request(app)
                        .post('/api/tables/' + table._id)
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .send({
                            lang: 'en'
                        })
                        .then(result => {
                            assert.equal(result.status, 201)
                            assert.equal(result.body.success, true)
                        })
                })
        })

    })
    
    describe('Appointment router tests', () => {
        
        test('Book an appointment for past and over 2 month limit', async() => {
            
            const past = new Date(new Date().setTime(new Date().getTime() - 24 * 3600 * 1000))
            const future = new Date(new Date().setTime(new Date().getTime() + 80 * 24 * 3600 * 1000))

            const restaurant = await Restaurant.findOne({ownerEmail: adminEmail}).exec()
            const tables     = await Table.find({RestaurantId: restaurant._id}).exec()
            
            const table = faker.random.arrayElement(tables)

            //Booking for past
            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: past.toString(),
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com",
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            //Booking for over two months
            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table._id,
                    date: future.toString(),
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com",
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })
        })

        test('Book an appointment', async() => {
            
            const date = new Date(new Date().setTime(new Date().getTime() + 24 * 3600 * 1000))
            const secondDate = new Date(new Date().setTime(new Date().getTime() + 48 * 3600 * 1000))

            const restaurant = await Restaurant.findOne({ownerEmail: adminEmail}).exec()
            const layout     = await Layout.findOne({RestaurantId: restaurant._id}).exec()
            
            const table = faker.random.arrayElement(layout.tables)

            //Booking with bad tableid
            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table.TableId + '1',
                    date: date.toString(),
                    peopleCount: table.tableCount,
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com",
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 404)
                    assert.equal(result.body.success, false)
                })

            //Booking with too many people
            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table.TableId,
                    date: date.toString(),
                    peopleCount: table.tableCount + 1,
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com",
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            //Booking with normal values
            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table.TableId,
                    date: date.toString(),
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com",
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 201)
                    assert.equal(result.body.success, true)
                })

            //Book for the same date twice - it is ok
            await request(app)
                .post('/api/appointments/book')
                .send({
                    tableId: table.TableId,
                    date: secondDate.toString(),
                    peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                    restaurantId: restaurant._id,
                    email: "guest@gmail.com",
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 201)
                    assert.equal(result.body.success, true)
                })
            
            //Book several dates with random date
            for(let i = 0; i < 15; ++i) {
                await request(app)
                    .post('/api/appointments/book')
                    .send({
                        tableId: table.TableId,
                        date: getRandomDate(new Date(new Date().getTime() + 3_600_000 * 2), new Date(new Date().getTime() + 3_600_000 * 50)),
                        peopleCount: faker.datatype.number({min: 1, max: table.tableCount}),
                        restaurantId: restaurant._id,
                        email: "guest@gmail.com",
                        lang: 'en'
                    })
                    .then(result => {
                        assert.equal(result.status, 201)
                        assert.equal(result.body.success, true)
                    })
            }
        })

        test('Disclaiming appointment', async() => {

            const appointment = await Appointment.findOne({}).exec()

            //Disclaiming with bad restaurantId
            await request(app)
                .delete('/api/appointments/disclaim')
                .send({
                    id: appointment._id,
                    restaurantId: appointment.RestaurantId + '1',
                    pin: appointment.code,
                    email: appointment.email,
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 404)
                    assert.equal(result.body.success, false)
                })

            //Disclaiming with false code
            await request(app)
                .delete('/api/appointments/disclaim')
                .send({
                    id: appointment._id,
                    restaurantId: appointment.RestaurantId,
                    pin: appointment.code + '1',
                    email: appointment.email,
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 400)
                    assert.equal(result.body.success, false)
                })

            //Good disclaiming
            await request(app)
                .delete('/api/appointments/disclaim')
                .send({
                    id: appointment._id,
                    restaurantId: appointment.RestaurantId,
                    pin: appointment.code,
                    email: appointment.email,
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 200)
                    assert.equal(result.body.success, true)
                })
        })
        
        test('User removing appointment', async() => {

            const appointment = await Appointment.findOne({}).exec()

            //Removing appointment as user
            await request(app)
                .post('/api/users/login/')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                .then(async loginResult => {
                    await request(app)
                        .delete('/api/appointments/delete-appointment/' + appointment._id)
                        .send({lang: 'en'})
                        .set('Cookie', loginResult.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.success, true)
                        })
                })
        })

        test('User accepting and disclaiming remaining appointments', async() => {

            const appointments = await Appointment.find({}).exec()

            for(let i = 0; i < appointments.length; ++i) {
                const appointment = appointments[i]
                await request(app)
                    .post('/api/users/login')
                    .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                    .then(async loginResult => {
                        await request(app)
                            .put('/api/appointments/accept-appointment/')
                            .set('Cookie', loginResult.headers['set-cookie'])
                            .send({
                                accept: i < appointments.length/2,
                                tableId: appointment.TableId,
                                appointmentId: appointment._id,
                                lang: 'en'
                            })
                            .then(result => {
                                assert.equal(result.status, 200)
                                assert.equal(result.body.success, true)
                            })
                    })
            }
        })

        test('Find tables', async() => {

            const restaurant = await Restaurant.findOne({}).exec()
            
            await request(app)
                .post('/api/appointments/search-tables')
                .set('Content-Type', 'application/json')
                .send({
                    restaurantId: restaurant._id,
                    date: new Date().setTime(new Date().getTime() + 24 * 4 * 3600 * 1000).toString(),
                    peopleCount: 1,
                    lang: 'en'
                })
                .then(result => {
                    assert.equal(result.status, 200)
                    assert.equal(result.body.success, true)
                })
        })

        test('Booking conflicts', async() => {
            
            const appointment = await Appointment.findOne({confirmed: true}).exec()

            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                .then(async loginData => {
                    await request(app)
                        .post('/api/appointments/booking-conflicts')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({tableId: appointment.TableId, date: appointment.date, peopleCount: appointment.peopleCount})
                        .then(result => {
                                assert.equal(result.status, 200)
                            assert.equal(result.body.message.length > 0, true)
                        })
                }) 
        })
    })

    describe('Menu router tests - delete item and category', () => {

        test('Delete item and category', async() => {

            const restaurant = await Restaurant.findOne({ownerEmail: adminEmail}).exec()
            const menu = await Menu.findOne({RestaurantId: restaurant._id}).exec()
            
            const itemCategory = Object.keys(menu.items)[0]
            const itemName = Object.keys(menu.items[itemCategory])[0]

            await request(app)
                .post('/api/users/login/')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
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

    describe('Information router test', () => {

        test('Getting informations data', async() => {
            //Try to get informations without logging in
            await request(app)
            .get('/api/informations')
                .set('Content-Type', 'application/json')
                .then(result => {
                    assert.equal(result.status, 401)
                })
    
            //Get informations after logging in
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                .then(async loginData => {
                    await request(app)
                    .get('/api/informations')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.message !== null, true)
                        })
                })
        })

        test('Get currency', async() => {
            //Try to get informations without logging in
            await request(app)
            .get('/api/informations/currency')
                .set('Content-Type', 'application/json')
                .then(result => {
                    assert.equal(result.status, 401)
                })
    
            //Get informations after logging in
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: faker.random.arrayElement(userEmails), password: "123456"})
                .then(async loginData => {
                    await request(app)
                    .get('/api/informations/currency')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 200)
                            assert.equal(result.body.message, 'Ft')
                        })
                })
        })
        
        test('Modifiy informations', async() => {
            
            //Try to update informations without logging in
            await request(app)
                .post('/api/informations/update')
                .set('Content-Type', 'application/json')
                .then(result => {
                    assert.equal(result.status, 401)
                })
    
            //Try to update informations as normal user
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: faker.random.arrayElement(userEmails.filter(email => email !== soonPromoted)), password: "123456"})
                .then(async loginData => {
                    await request(app)
                        .post('/api/informations/update')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .then(result => {
                            assert.equal(result.status, 401)
                        })
                })
            
            //Update informations as admin
            await request(app)
                .post('/api/users/login')
                .set('Content-Type', 'application/json')
                .send({email: adminEmail, password: "123456"})
                .then(async loginData => {
                    await request(app)
                        .post('/api/informations/update')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send({
                            taxNumber: faker.datatype.number({min: 10000000, max: 1000000000}).toString(),
                            address: faker.address.streetAddress(),
                            city: faker.address.city(),
                            postalCode: faker.address.zipCode(),
                            phoneNumber: faker.phone.phoneNumber(),
                            currency: 'HUF',
                            openingTimes: [
                                //Monday
                                {
                                    open: {
                                        hours: "00",
                                        minutes: "00"
                                    },
                                    close: {
                                        hours: "00",
                                        minutes: "00"
                                    }
                                },
                                //Tuesday
                                {
                                    open: {
                                        hours: "08",
                                        minutes: "00"
                                    },
                                    close: {
                                        hours: "16",
                                        minutes: "00"
                                    }
                                },
                                //Wednesday
                                {
                                    open: {
                                        hours: "05",
                                        minutes: "30"
                                    },
                                    close: {
                                        hours: "20",
                                        minutes: "15"
                                    }
                                },
                                //Thursday
                                {
                                    open: {
                                        hours: "08",
                                        minutes: "00"
                                    },
                                    close: {
                                        hours: "16",
                                        minutes: "00"
                                    }
                                },
                                //Friday
                                {
                                    open: {
                                        hours: "12",
                                        minutes: "00"
                                    },
                                    close: {
                                        hours: "05",
                                        minutes: "00"
                                    }
                                },
                                //Saturday
                                {
                                    open: {
                                        hours: "12",
                                        minutes: "00"
                                    },
                                    close: {
                                        hours: "02",
                                        minutes: "00"
                                    }
                                },
                                //Sunday
                                {
                                    open: {
                                        hours: "05",
                                        minutes: "00"
                                    },
                                    close: {
                                        hours: "02",
                                        minutes: "00"
                                    }
                                },
                            ]
                        })
                        .then(result => {
                            assert.equal(result.status, 200)
                        })
                    const data = {
                        taxNumber: faker.datatype.number({min: 10000000, max: 1000000000}).toString(),
                        address: faker.address.streetAddress(),
                        city: faker.address.city(),
                        postalCode: faker.address.zipCode(),
                        phoneNumber: faker.phone.phoneNumber(),
                        currency: 'HUF',
                        openingTimes: [
                            //Monday
                            {
                                open: {
                                    hours: "01",
                                    minutes: "00"
                                },
                                close: {
                                    hours: "15",
                                    minutes: "00"
                                }
                            },
                            //Tuesday
                            {
                                open: {
                                    hours: "08",
                                    minutes: "00"
                                },
                                close: {
                                    hours: "16",
                                    minutes: "00"
                                }
                            },
                            //Wednesday
                            {
                                open: {
                                    hours: "05",
                                    minutes: "30"
                                },
                                close: {
                                    hours: "20",
                                    minutes: "15"
                                }
                            },
                            //Thursday
                            {
                                open: {
                                    hours: "08",
                                    minutes: "00"
                                },
                                close: {
                                    hours: "16",
                                    minutes: "00"
                                }
                            },
                            //Friday
                            {
                                open: {
                                    hours: "12",
                                    minutes: "00"
                                },
                                close: {
                                    hours: "05",
                                    minutes: "00"
                                }
                            },
                            //Saturday
                            {
                                open: {
                                    hours: "12",
                                    minutes: "00"
                                },
                                close: {
                                    hours: "02",
                                    minutes: "00"
                                }
                            },
                            //Sunday
                            {
                                open: {
                                    hours: "05",
                                    minutes: "00"
                                },
                                close: {
                                    hours: "02",
                                    minutes: "00"
                                }
                            },
                        ]
                    }
                    await request(app)
                        .post('/api/informations/update')
                        .set('Content-Type', 'application/json')
                        .set('Cookie', loginData.headers['set-cookie'])
                        .send(data)
                        .then(result => {
                            assert.equal(result.status, 400)
                        })
                })

        })
    })

    describe('Test restaurant opens', () => {

        beforeEach(() => {
            jest.setTimeout(10000)
        })

        test('Restaurant not open on Monday from 02:00-24:00', async() => {
            const monday = getNextGivenDay(1)

            const table = await Table.findOne({}).exec()
            for(let i = 3; i < 24; ++i) {
                monday.setHours(i, faker.datatype.number({min: 0, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: monday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }

            monday.setHours(0, faker.datatype.number({min: 0, max: 59}), 0, 0)
            await request(app)
                .post('/api/appointments/book')
                .set('Content-Type', 'application/json')
                .send({
                        tableId: table._id,
                        restaurantId: table.RestaurantId,
                        date: monday.toString(),
                        peopleCount: 1,
                        email: faker.internet.email(),
                        lang: 'en'
                    })
                .then(result => {
                    assert.equal(result.status, 201)
                })                
        })

        test('Restaurant open on Tuesday from 08:00-16:00', async() => {
            const tuesday = getNextGivenDay(2)

            const table = await Table.findOne({}).exec()
            for(let i = 0; i < 8; ++i) {
                tuesday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: tuesday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }         
            for(let i = 8; i < 16; ++i) {
                tuesday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: tuesday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }         
            for(let i = 16; i < 24; ++i) {
                tuesday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: tuesday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }         
        })
        
        test('Restaurant open on Wednesday from 05:30-20:15', async() => {

            const wednesday = getNextGivenDay(3)

            const table = await Table.findOne({}).exec()
            for(let i = 0; i < 6; ++i) {
                wednesday.setHours(i, faker.datatype.number({min: 1, max: i == 5 ? 29 : 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: wednesday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }         
            for(let i = 6; i < 21; ++i) {
                wednesday.setHours(i, faker.datatype.number({min: 1, max: i == 20 ? 15 : 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: wednesday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }         
            for(let i = 21; i < 24; ++i) {
                wednesday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: wednesday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }
        })
        test('Restaurant open on Thursday from 08:00-16:00', async() => {

            const thursday = getNextGivenDay(4)

            const table = await Table.findOne({}).exec()
            for(let i = 0; i < 8; ++i) {
                thursday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: thursday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }         
            for(let i = 8; i < 16; ++i) {
                thursday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: thursday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }         
            for(let i = 16; i < 24; ++i) {
                thursday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: thursday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }
        })
        test('Restaurant open on Friday from 12:00-05:00', async() => {

            const friday = getNextGivenDay(5)

            const table = await Table.findOne({}).exec()
            for(let i = 0; i < 24; ++i) {
                friday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: friday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, i < 12 ? 400 : 201)
                    })
            }
        })
        test('Restaurant open on Saturday from 12:00-02:00', async() => {

            const saturday = getNextGivenDay(6)

            const table = await Table.findOne({}).exec()
            for(let i = 0; i < 5; ++i) {
                saturday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: saturday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }
            for(let i = 5; i < 12; ++i) {
                saturday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: saturday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }
            for(let i = 12; i < 24; ++i) {
                saturday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: saturday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }
        })
        test('Restaurant open on Sunday from 05:00-02:00', async() => {

            const saturday = getNextGivenDay(7)

            const table = await Table.findOne({}).exec()
            for(let i = 0; i < 2; ++i) {
                saturday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: saturday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }
            for(let i = 2; i < 5; ++i) {
                saturday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: saturday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 400)
                    })
            }
            for(let i = 5; i < 24; ++i) {
                saturday.setHours(i, faker.datatype.number({min: 1, max: 59}), 0, 0)
                await request(app)
                    .post('/api/appointments/book')
                    .set('Content-Type', 'application/json')
                    .send({
                            tableId: table._id,
                            restaurantId: table.RestaurantId,
                            date: saturday.toString(),
                            peopleCount: 1,
                            email: faker.internet.email(),
                            lang: 'en'
                        })
                    .then(result => {
                        assert.equal(result.status, 201)
                    })
            }
        })
    })
})

afterAll(async () => {
    console.log('Closing connection...')
    await mongoose.connection.close()
    await httpServer.close()
    io.close()
})