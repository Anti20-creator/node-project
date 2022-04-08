const Informations = require('../models/InformationsModel')

class InformationNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'InformationNotFoundError'
    }
}

const findById = async (id) => {
    const informations = await Informations.findOne({RestaurantId: id}).exec()
    if(!informations) {
        throw new InformationNotFoundError("informations-not-found")
    }

    return informations
} 

module.exports = { findById }