const app = require('./app/app')
const port = process.env.PORT || 4001

/* Starting the app */
app.listen(port, () => {
    console.log('Server started...')
})