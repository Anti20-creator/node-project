const Httpresponse = require('../utils/ErrorCreator')

class MissingFieldError extends Error {
    constructor(message) {
        super(message)
        this.name = 'MissingFieldError'
    }
}

class FieldTypeError extends Error {
    constructor(message) {
        super(message)
        this.name = 'FieldTypeError'
    }
}

const destructureBody = (req, res, items) => {
    const response = {}
    for (const key in items) {
        const bodyItem = req.body[key]
        if(bodyItem === undefined || bodyItem === null){
            throw new MissingFieldError(key + " not represented!")
        }
        if(typeof bodyItem !== items[key]) {
            throw new FieldTypeError(key + " type not match requirements!")
        }
        response[key] = bodyItem
    }
    return response
}

const destructureParams = (req, res, ...items) => {
    const response = {}

    for (const item of items) {
        const keys = Object.keys(item)
        if(keys.length !== 1) {
            return Httpresponse.BadRequest(res, "Badly formatted destructure!")
        }
        
        const key = keys[0]
        
        const bodyItem = req.params[key]
        if(!bodyItem || typeof bodyItem !== item[key]) {
            return Httpresponse.BadRequest(res, key + " type not match requirements!")
        }
        response[key] = bodyItem
    }

    return response
}

module.exports = {destructureBody, destructureParams}
