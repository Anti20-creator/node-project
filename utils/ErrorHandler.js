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

        case 'InformationError': {
            return Httpresponse.NotFound(res, err.message)
        }
        
        case 'LayoutNotFoundError': {
            return Httpresponse.NotFound(res, err.message)
        }

        case 'MenuNotFoundError': {
            return Httpresponse.NotFound(res, err.message)
        }

        case 'TableNotFoundError': {
            return Httpresponse.NotFound(res, err.message)
        }
        
        case 'RestaurantNotFoundError': {
            return Httpresponse.NotFound(res, err.message)
        }

        case 'TableUseNotCorrect': {
            return Httpresponse.BadRequest(res, err.message)
        }

        default: {
            return Httpresponse.BadRequest(res, "unexpected-error")
        }
    }
})

module.exports = { catchErrors }