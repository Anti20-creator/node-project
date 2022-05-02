const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const User = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        validate: {
            validator: function(v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: "invalid-email"
        },
        trim: true
    },
    fullName: {
        type: String,
        trim: true,
        required: [true, 'short-username'],
        minlength: [4, 'short-username']
    },
    password: {
        type: String,
        required: true
    },
    restaurantName: {
        type: String,
        minlength: [1, 'short-restaurantname'],
        required: [true, 'short-restaurantname']
    },
    restaurantId: {
        type: String,
        required: false
    },
    isAdmin: {
        type: Boolean,
        required: true
    }
})

User.methods.comparePassword = function(plainPass) {
    return bcrypt.compareSync(plainPass, this.password)
}

const userMongooseModel = mongoose.model('User', User)

if (process.env.TESTING === '0') userMongooseModel.collection.createIndex( { email: 1 }, { unique: true } )

module.exports = userMongooseModel
