const Httpresponse = require('../utils/ErrorCreator')

const catchErrors = action => (req, res, next) => action(req, res).catch((err) => {
    console.log(err)
    switch(err.name) {
        case 'MissingFieldError': {
            return Httpresponse.BadRequest(res, err.message)
        }

        case 'FieldTypeError': {
            return Httpresponse.BadRequest(res, err.message)
        }

        default: {
            return Httpresponse.BadRequest(res, "Unexpected error")
        }
    }
})

module.exports = { catchErrors }