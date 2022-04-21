const Restaurant = require('../models/RestaurantModel')

class RestaurantNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'RestaurantNotFoundError'
    }
}

const findById = async(id) => {
    const restaurant = await Restaurant.findById(id)

    if(!restaurant) {
        throw new RestaurantNotFoundError("no-restaurant-found")
    }
    return restaurant
}

module.exports = { findById }