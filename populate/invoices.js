const menu = require('./menu')
require('dotenv').config()
const mongoose = require('mongoose')
const { createServer } = require('http')
const { events } = require('../socket/events')
const { Server } = require('socket.io')
const { faker } = require('@faker-js/faker')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout      = require('../models/LayoutModel')
const Menu        = require('../models/MenuModel')
const Informations= require('../models/InformationsModel')
const app = require('../app/app')
const request = require('supertest')

const main = async() => {

    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
        events(io)
        app.set('socketio', io)
    })

    const users = await User.find({}).exec()
    
    for(let i = 0; i < users.length; ++i) {
        request(app)
            .post('/api/users/login')
            .set('Content-Type', 'application/json')
            .send({email: users[i].email, password: "123456"})
            .then(async loginData => {
                await createInvoiceForOneTable(loginData)
                await createInvoiceForOneTable(loginData)
                await createInvoiceForOneTable(loginData)
            })
    }
} 

main()

const createInvoiceForOneTable = async (loginData) => {

    const result = await request(app)
        .get('/api/tables/tables')
        .set('Cookie', loginData.headers['set-cookie'])
        .set('Content-Type', 'application/json')
    
    const table = faker.random.arrayElement(result.body.message.filter(table => !table.inLiveUse))
        
    await request(app)
        .post('/api/tables/book')
        .set('Cookie', loginData.headers['set-cookie'])
        .set('Content-Type', 'application/json')
        .send({tableId: table._id})

    const count = faker.datatype.number({min: 1, max: 5})
    const itemCategory = faker.random.arrayElement(Object.keys(menu))
    const item = faker.random.arrayElement(menu[itemCategory].items)
        
    for(let i = 0; i < count; ++i) {
        await request(app)
            .post('/api/tables/order')
            .set('Cookie', loginData.headers['set-cookie'])
            .set('Content-Type', 'application/json')
            .send({tableId: table._id, item: {category: itemCategory, name: item, quantity: 1}, socketId: 'socket-id'})
            .then(result => {console.log(result.body)})
    }

    await request(app)
        .get('/api/tables/' + table._id)
        .set('Cookie', loginData.headers['set-cookie'])
        .set('Content-Type', 'application/json').then(result => {
            console.log(result.body)
        })
}