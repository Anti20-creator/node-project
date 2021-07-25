const app = require('./app/app')
const cors = require('cors')
const port = process.env.PORT || 4001
const https = require('https')
const fs = require('fs')

/*
const corsConfig = {
    origin: true,
    credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))
*/

const privateKey = fs.readFileSync('./keys/key.pem', 'utf-8')
const certificate = fs.readFileSync('./keys/server.crt', 'utf-8')

app.get('/', (req, res) => {
    res.cookie('asdsd', 'asdasd')
    res.send('<h1>sajdasjd</h1>')
})

https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(443, () => {
    console.log('Server started ' + port)
})

/* Starting the app
app.listen(port, () => {
    console.log('Server started...')
})*/