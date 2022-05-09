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

const destructureBody = (req, items) => {
    const response = {}
    for (const key in items) {
        const bodyItem = req.body[key]
        if(bodyItem === undefined || bodyItem === null){
            throw new MissingFieldError("missing-parameter")
        }
        if(typeof bodyItem !== items[key]) {
            throw new FieldTypeError("body-type-error")
        }
        response[key] = bodyItem
    }
    return response
    
}

const destructureParams = (req, items) => {
    const response = {}
    for (const key in items) {
        const bodyItem = req.params[key]
        if(bodyItem === undefined || bodyItem === null){
            throw new MissingFieldError("missing-parameter")
        }
        if(typeof bodyItem !== items[key]) {
            throw new FieldTypeError("body-type-error")
        }
        response[key] = bodyItem
    }
    return response
}

module.exports = {destructureBody, destructureParams}
