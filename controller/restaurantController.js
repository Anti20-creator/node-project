const Restaurant = require('../models/RestaurantModel')

class RestaurantNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'RestaurantNotFoundError'
    }
}

const findByAuth = async(req, res) => {
    const restaurant = await Restaurant.findById(req.user.restaurantId)

    if(!restaurant) {
        throw new RestaurantNotFoundError("no-restaurant-found")
    }
    return restaurant
}

module.exports = { findByAuth }