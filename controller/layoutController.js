const Layout = require('../models/LayoutModel')
const Httpresponse = require('../utils/ErrorCreator')

const findByAuth = async(res, id) => {
    const layout = await Layout.findOne({RestaurantId: id}).exec()
    if(!layout) {
        return Httpresponse.NotFound(res, "Layout not found!")
    }

    return layout
}

module.exports = { findByAuth }