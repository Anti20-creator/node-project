const app = require('./app/app')
const cors = require('cors')
const port = process.env.PORT || 4001
const https = require('https')
const fs = require('fs')
const { events } = require('./socket/events')
const { Server } = require('socket.io')

const corsConfig = {
    origin: true,
    credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))

const privateKey = fs.readFileSync('./keys/key.pem', 'utf-8')
const certificate = fs.readFileSync('./keys/server.crt', 'utf-8')

const server = https.createServer({
    key: privateKey,
    cert: certificate
}, app)

const io = new Server(server, {
    cors: {
        origin: ["*"],
        credentials: true
    },
    allowEIO3: true
})

events(io)
app.set('socketio', io)

server.listen(port, () => {
    console.log('Server started ' + port)
})

module.exports = { io }