const mongoose = require('mongoose')

const InformationsModel = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    city: {
        type: String,
    },
    postalCode: {
        type: String,
    },
    address: {
        type: String,
    },
    taxNumber: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    openingTimes: {
        type: Array,
        default: Array.from(Array(7)).map(() => {return {
            "open": {"hours": "00", "minutes": "00"},
            "close": {"hours": "24", "minutes": "00"}
	    }}),
        validate: {
            validator: function (openingTimes) {
                const openingTimesClone = openingTimes.slice()
                for(let i = 0; i < openingTimesClone.length; ++i) {
                    if(openingTimesClone[i].open.hours.length !== 2 || isNaN(openingTimesClone[i].open.hours)
                        || openingTimesClone[i].open.minutes.length !== 2 || isNaN(openingTimesClone[i].open.minutes)
                        || openingTimesClone[i].close.hours.length !== 2 || isNaN(openingTimesClone[i].close.hours)
                        || openingTimesClone[i].close.minutes.length !== 2 || isNaN(openingTimesClone[i].close.minutes) 
                        ) {
                            return false
                        }
                }
                openingTimesClone.push(openingTimesClone[0])
                for(let i = 1; i < openingTimesClone.length; ++i) {
                    if( Number(openingTimesClone[i-1].open.hours) > Number(openingTimesClone[i-1].close.hours) || (
                        Number(openingTimesClone[i-1].open.hours) === Number(openingTimesClone[i-1].close.hours) &&
                        Number(openingTimesClone[i-1].open.minutes) > Number(openingTimesClone[i-1].close.minutes)
                    ) ) {
                        if( (Number(openingTimesClone[i].open.hours) < Number(openingTimesClone[i-1].close.hours) || (
                            Number(openingTimesClone[i].open.hours) === Number(openingTimesClone[i-1].close.hours) && Number(openingTimesClone[i].open.minutes) < Number(openingTimesClone[i-1].close.minutes)
                        )) && !((Number(openingTimesClone[i].open.hours) === Number(openingTimesClone[i].close.hours) && Number(openingTimesClone[i].open.minutes) === Number(openingTimesClone[i].close.minutes)) && Number(openingTimesClone[i].open.hours) === 0) ) {
                            return false
                        }
                    }
                }

                return true
            },
            message: "opening-times-invalid"
        },
        required: [true, "opening-times-invalid"]
    },
    currency: {
        type: String,
        enum: {
            values: ['USD', 'EUR', 'HUF'],
            message: "invalid-currency"
        },
        required: [true, 'invalid-currency'],
        default: 'HUF'
    }
})

const informationsMongooseModel = mongoose.model('Information', InformationsModel)
if (process.env.TESTING === '0') informationsMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

module.exports = informationsMongooseModel
