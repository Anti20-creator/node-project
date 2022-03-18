const express = require('express')
const app = express()
const bodyparser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path')
require('dotenv').config()
const jwt = require('jsonwebtoken')

/* Importing routers */
const usersRouter = require('../routers/users')
const appointmentsRouter = require('../routers/appointment2')
const layoutsRouter = require('../routers/layout')
const tablesRouter = require('../routers/tables')
const menuRouter = require('../routers/menu')
const invoicesRouter = require('../routers/invoices')
const informationsRouter = require('../routers/informations')
const { authenticateAccessToken, authenticateFilePermission } = require('../middlewares/auth')

app.use(bodyparser.json())
app.use(cookieParser())

const corsConfig = {
    origin: true,
    credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))
//app.use(express.static(path.join(__dirname, 'public')))

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://192.168.31.161:3000")
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

app.use(async (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    return res.status(400).send({success: false, message: "Request failed..."})
});

app.get('/', (req, res) => {
	for(let i = 0; i < 1e8; ++i) {}
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
app.use('/api/invoices', invoicesRouter)
app.use('/api/informations', informationsRouter)
//app.use('/public/backgrounds', express.static("public"))
app.use('/public/invoices', [authenticateAccessToken, authenticateFilePermission, express.static("public")])


module.exports = app
