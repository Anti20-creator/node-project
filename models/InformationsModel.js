const mongoose = require('mongoose')

const InformationsModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    city: {
        type: String
    },
    postalCode: {
        type: String
    },
    address: {
        type: String
    },
    taxNumber: {
        type: String
    },
    phoneNumber: {
        type: String
    },
    openingTimes: {
        type: Array,
        default: Array.from(Array(7)).map(() => {return {
		"open": {"hours": 0, "minutes": 0},
		"close": {"hours": 24, "minutes": 0}
	}})
    },
    currency: {
	type: String,
	enum: ['USD', 'EUR', 'HUF'],
	default: 'HUF'
    }
})

const informationsMongooseModel = mongoose.model('Information', InformationsModel)
informationsMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

/*try {
    informationsMongooseModel.collection.dropIndexes()
}catch(e) {}*/

module.exports = informationsMongooseModel
