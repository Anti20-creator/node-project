const Appointments = require('../models/AppointmentModel')

const findConflicts = async (restaurantId, tableId, startDate, endDate, returnType) => {
    const results = await Appointments.collection.find({
        RestaurantId: {
            $eq: restaurantId,
        },
        TableId: {
            $eq: tableId
        },
        date: {
            $gt: startDate,
            $lt: endDate
        },
        confirmed: {
            $eq: true
        }
    }).toArray()

    if(returnType === 'length') {
        return results.length
    }else{
        return results
    }
}

module.exports = { findConflicts }