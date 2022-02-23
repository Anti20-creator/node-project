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
        enum: ['rounded', 'normal']
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
    }]
});

const layoutMongooseModel = mongoose.model('layout', LayoutSchema)

layoutMongooseModel.collection.createIndex( { RestaurantId: 1 }, { unique: true } )

module.exports = layoutMongooseModel