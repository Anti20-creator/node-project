const Httpresponse = require('../utils/ErrorCreator')

const catchErrors = action => (req, res, next) => action(req, res).catch((err) => {
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

        case 'TableNotFound': {
            return Httpresponse.NotFound(res, err.message)
        }
        
        case 'RestaurantNotFoundError': {
            return Httpresponse.NotFound(res, err.message)
        }

        case 'TableUseNotCorrect': {
            return Httpresponse.BadRequest(res, err.message)
        }

        case 'ValidationError': {
            return Httpresponse.BadRequest(res, err.errors[Object.keys(err.errors)[0]].message)
        }

        case 'DateError': {
            return Httpresponse.BadRequest(res, err.message)
        }

        case 'TableSeatError': {
            return Httpresponse.BadRequest(res, err.message)
        }

        default: {
            return Httpresponse.BadRequest(res, err.message)
        }
    }
})

module.exports = { catchErrors }