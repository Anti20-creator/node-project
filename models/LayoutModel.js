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
    }
})

const LayoutSchema = new mongoose.Schema({
    RestaurantId: {
        type: Number,
        required: true
    },
    tables: [{
        type: tableSchema
    }]
});

