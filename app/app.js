const express = require('express')
const app = express()
const bodyparser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path')
require('dotenv').config()

/* Importing routers */
const usersRouter = require('../routers/users')
const appointmentsRouter = require('../routers/appointment')
const layoutsRouter = require('../routers/layout')
const tablesRouter = require('../routers/tables')
const menuRouter = require('../routers/menu')

app.use(bodyparser.json())
app.use(cookieParser())

const corsConfig = {
    origin: true,
    credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))
app.use(express.static(path.join(__dirname, 'public')))

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://192.168.31.160:3000")
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})
app.get('/', (req, res) => {
	res.send('Hello')
})

/* Connecting to MongoDB Database */
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false}, (data) => {
    console.log('Connecting to DB...')
})
mongoose.connection.on('error', (error) => {
    console.log('Error while connecting to DB...')
})

app.use('/api/users', usersRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/layouts', layoutsRouter)
app.use('/api/tables', tablesRouter)
app.use('/api/menu', menuRouter)
app.use(express.static('public'));

module.exports = app
