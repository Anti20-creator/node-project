const app = require('./app/app')
const cors = require('cors')
const port = process.env.PORT || 4001


const corsConfig = {
    origin: true,
    credentials: true
}
app.use(cors(corsConfig))
app.options('*', cors(corsConfig))

/* Starting the app */
app.listen(port, () => {
    console.log('Server started...')
})