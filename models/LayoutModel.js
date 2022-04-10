const mongoose = require('mongoose')

const tableSchema = new mongoose.Schema({
    coordinates: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        }
    },
    tableCount: {
        type: Number,
        required: true
    },
    tableType: {
        type: String,
        enum: ['rounded', 'normal', 'wide']
    },
    size: {
	    type: String,
    },
    direction: {
        type: Number
    },
    TableId: {
        type: String,
        required: true
    },
    localId: {
        type: Number,
        required: true
    }
})

const LayoutSchema = new mongoose.Schema({
    RestaurantId: {
        type: String,
        required: true
    },
    tables: [{
        type: tableSchema
    }],
    sizeX: {
	    type: Number
    },
    sizeY: {
	    type: Number
    },
    backgroundImage: {
	    type: String
    }
});

const layoutMongooseModel = mongoose.model('layout', LayoutSchema)

if (process.env.TESTING === '0') layoutMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )
/*try {
    layoutMongooseModel.collection.dropIndexes()
}catch(e) {}*/

module.exports = layoutMongooseModel
