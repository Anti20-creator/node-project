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
        type: Number,
        enum: [0, 90, 180, 270]
    },
    TableId: {
        type: String,
        required: true
    },
    localId: {
        type: Number,
        required: true,
        unique: true //új
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

module.exports = layoutMongooseModel
