const mongoose = require('mongoose')
const Restaurant = require('./RestaurantModel')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

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
        }
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

/*
* We need to store user's password as a hash
* @library used for that: bcrypt
* */

User.pre('save', function async(next) {
    try {
        const salt = bcrypt.genSaltSync(10)
        this.password = bcrypt.hashSync(this.password, salt)
        next()
    } catch(err) {
        next(err)
    }
})


/*
* If user creation is successful, then we need to add a new restaurant for the owner.
* If the user isn't an admin then we have to add him to the assigned restaurant.
* */
User.post('save', async function(doc, next) {
    console.log('User created:', doc)

    if(doc.isAdmin){

        const restaurant = new Restaurant({
            ownerId: doc._id,
            ownerEmail: doc.email,
            restaurantName: doc.restaurantName,
            employees: [],
            secretPin: crypto.randomBytes(5).toString('hex')
        })

        await restaurant.save()

        let id = null
        await Restaurant.findOne({ownerId: doc._id}, (err, data) => {
            id = data._id
        })

        doc.restaurantId = id

        await mongoose.model('User', User).findByIdAndUpdate(doc._id, {
            $set: {
                restaurantId: id
            }
        }, {
            new: true
        }, (err, data) => {
            if(err) console.log(err)
            console.log(data)
        })


    }else{

        //console.log('THIS IS GOING')
        await Restaurant.findByIdAndUpdate(doc.restaurantId, {
            $addToSet: {
                employees: doc._id
            }
        }, (err, data) => {
            console.log('Updated:', data)
        })

    }

    next()
})

User.methods.comparePassword = function(plainPass) {
    return bcrypt.compareSync(plainPass, this.password)
}

module.exports = mongoose.model('User', User)