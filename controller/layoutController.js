const Layout = require('../models/LayoutModel')

class LayoutNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'LayoutNotFoundError'
    }
}

const findById = async(id) => {
    const layout = await Layout.findOne({RestaurantId: id}).exec()
    if(!layout) {
        throw new LayoutNotFoundError("layout-not-found")
    }

    return layout
}

module.exports = { findById }