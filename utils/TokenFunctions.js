const jwt = require('jsonwebtoken')

class Tokens {

    static generateAccessToken(data) {

        return jwt.sign({
            userId: data._id,
            isAdmin: data.isAdmin,
            restaurantId: data.restaurantId
        }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15d'})

    }

    static generateRefreshToken(data) {

        return jwt.sign({
            userId: data._id
        }, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '365d'})
    }

    static validateAccessToken(req) {

        let token = req.cookies['Authorization']
        if(token){
            token = token.split(' ')[1]
        }else{
            return false;
        }

        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if(err) {
                return false
            }else{
                return decoded
            }
        })
    }

    static validateRefreshToken(req) {
        let token = req.cookies['Refresh-token']

        if(token){
            token = token.split(' ')[1]
        }else{
            return false;
        }

        return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if(err) {
                return false
            }else{
                return decoded
            }
        })

    }
}

module.exports = Tokens