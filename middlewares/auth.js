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

async function authenticateOwnerAccessToken (req, res, next) {
    const validate = await Tokens.validateOwnerAccessToken(req)
    if(validate) {
        req.user = validate
        next();
    }else{
        Httpresponse.Unauthorized(res, "You don't have access to that resource!")
    }
}

async function authenticateFilePermission (req, res, next) {

    const restaurantId = req.user.restaurantId

    if(req.url.split('.')[0].split('_')[2] !== restaurantId) {
        return Httpresponse.Forbidden(res, "You don't have access to this!")
    }else{
        next()
    }
}

module.exports = {
    authenticateAccessToken, 
    authenticateRefreshToken, 
    authenticateAdminAccessToken, 
    authenticateOwnerAccessToken,
    authenticateFilePermission
};