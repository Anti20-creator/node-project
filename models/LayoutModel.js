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
        required: true,
        min: [1, 'invalid-tablecount']
    },
    tableType: {
        type: String,
        enum: ['rounded', 'normal', 'wide']
    },
    size: {
	    type: String,
        enum: ['small', 'average', 'large']
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
	    type: Number,
        min: [200, 'small-x'],
        default: 1000
    },
    sizeY: {
	    type: Number,
        min: [200, 'small-y'],
        default: 1000
    },
    backgroundImage: {
	    type: String
    }
});

const layoutMongooseModel = mongoose.model('layout', LayoutSchema)

if (process.env.TESTING === '0') layoutMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

module.exports = layoutMongooseModel
