const mongoose = require('mongoose')
const Restaurant = require('./RestaurantModel')

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
                return password.length > 5 && password.length < 13
            },
            message: "Your email should be 6-12 characters long!"
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
* If user creation is successful, then we need to add a new restaurant for the owner.
* If the user isn't an admin then we have to add him to the assigned restaurant.
* */
User.post('save', async(doc, next) => {
    console.log('User created:', doc)

    if(doc.isAdmin){
        const restaurant = new Restaurant({
            ownerId: doc._id,
            ownerEmail: doc.email,
            restaurantName: doc.restaurantName,
            employees: []
        })

        await restaurant.save()

        let id = null
        await Restaurant.findOne({ownerId: doc._id}, (err, data) => {
            console.log('FIND:', data)
            id = data._id
        })
        console.log('ID:', id)

        doc.restaurantId = id

        console.log('DOC:', doc)

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

        Restaurant.findByIdAndUpdate(doc.restaurantId, {
            $push: {
                employees: doc._id
            }
        }, (err, data) => {
            console.log(err)
            console.log(data)
        })

    }

    next()
})

module.exports = mongoose.model('User', User)