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
    tableCount: Number,
    tableType: {
        type: String,
        enum: ['round', 'normal']
    },
    direction: {
        type: Number
    },
    TableId: {
        type: String,
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