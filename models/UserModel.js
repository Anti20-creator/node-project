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
            message: "Please enter a valid email!"
        },
        trim: true
    },
    fullName: {
        type: String,
        trim: true,
        required: true,
        validate: {
            validator: function(name) {
                return name.length > 4
            },
            message: "Your name must be longer!"
        }
    },
    password: {
        type: String,
        required: true,
        validate: {
            validator: function(password) {
                return password.length > 5
            },
            message: "Your email should be longer than 5 characters!"
        }
    },
    restaurantName: {
        type: String,
        validate: {
            validator: function(restaurant) {
                return restaurant.length > 1
            },
            message: "Your email should be longer than one character!"
        },
        required: true
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

/*try {
    userMongooseModel.collection.dropIndexes()
    //userMongooseModel.collection.createIndex( { email: 1 }, { unique: true } )
}catch(e) {}*/

module.exports = userMongooseModel
