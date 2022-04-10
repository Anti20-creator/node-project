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
		"open": {"hours": "00", "minutes": "00"},
		"close": {"hours": "24", "minutes": "00"}
	}})
    },
    currency: {
	type: String,
	enum: ['USD', 'EUR', 'HUF'],
	default: 'HUF'
    }
})

const informationsMongooseModel = mongoose.model('Information', InformationsModel)
if (process.env.TESTING === '0') informationsMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

/*try {
    informationsMongooseModel.collection.dropIndexes()
}catch(e) {}*/

module.exports = informationsMongooseModel
