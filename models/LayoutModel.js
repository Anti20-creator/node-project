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
        enum: ['round', 'normal']
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

module.exports = mongoose.model('layout', LayoutSchema)
