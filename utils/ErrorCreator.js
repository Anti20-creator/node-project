/*
* @param statusCode = the returned status
* */

class HttpResponse {

    static Created(res, message) {
        res.status(201).send({
            success: true,
            message: message
        })
    }

    static OK(res, message) {
        res.status(200).send({
            success: true,
            message: message
        })
    }

    static BadRequest(res, message) {
        res.status(400).send({
            success: true,
            message: message
        })
    }

    static Unauthorized(res, message) {
        res.status(401).send({
            success: false,
            message: message
        })
    }

    static Forbidden(res, message) {
        res.status(403).send({
            success: false,
            message: message
        })
    }

    static NotFound(res, message) {
        res.status(404).send({
            success: false,
            message: message
        })
    }

    static Conflict(res, message, errors = {}) {
        res.status(409).send({
            success: false,
            message: message,
            errors: errors
        })
    }

}

module.exports = HttpResponse