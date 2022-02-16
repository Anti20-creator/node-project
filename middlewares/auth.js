const Tokens = require('../utils/TokenFunctions')
const Httpresponse = require('../utils/ErrorCreator')

function authenticateAccessToken (req, res, next) {
    const validate = Tokens.validateAccessToken(req)
    if(validate) {
        req.user = validate
        next();
    }else{
        Httpresponse.Unauthorized(res, "Unathorized user!")
    }
}

function authenticateRefreshToken (req, res, next) {
    const validate = Tokens.validateRefreshToken(req)
    if(validate) {
        req.user = validate
        next();
    }else{
        Httpresponse.Unauthorized(res, "Unathorized user!")
    }
}

function authenticateAdminAccessToken (req, res, next) {
    const validate = Tokens.validateAdminAccessToken(req)
    if(validate) {
        req.user = validate
        next();
    }else{
        Httpresponse.Unauthorized(res, "You don't have access to that resource!")
    }
}

module.exports = {authenticateAccessToken, authenticateRefreshToken, authenticateAdminAccessToken};