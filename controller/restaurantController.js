const Restaurant = require('../models/RestaurantModel')
const Httpresponse = require('../utils/ErrorCreator')

const findByAuth = async(req, res) => {
    const restaurant = await Restaurant.findById(req.user.restaurantId)

    if(!restaurant) {
        return Httpresponse.NotFound(res, "No restaurant found!")
    }
    return restaurant
}

module.exports = { findByAuth }