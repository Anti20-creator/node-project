const Informations = require('../models/InformationsModel')
const Httpresponse = require('../utils/ErrorCreator')

const findByAuth = async (res, id) => {
    const informations = await Informations.findOne({RestaurantId: id}).exec()
    if(!informations) {
        return Httpresponse.NotFound(res, "No informations found!")
    }

    return informations
} 

module.exports = { findByAuth }