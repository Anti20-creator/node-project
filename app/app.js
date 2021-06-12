const express = require('express')
const app = express()
const bodyparser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()
const users = require('../routes/users')
app.use(bodyparser.json())

/* Connecting to MongoDB Database */
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false}, (data) => {
    console.log('Connecting to DB...')
})
mongoose.connection.on('error', (error) => {
    console.log('Error while connecting to DB...')
})


app.use('/api/users', users)

module.exports = app