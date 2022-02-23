require('dotenv').config()
const mongoose = require('mongoose')
const { faker } = require('@faker-js/faker')

const Layout      = require('../models/LayoutModel')

function isOver(table, tables) {
    return tables.filter(t => t.localId !== table.localId).filter(t => Math.abs(t.coordinates.x - table.coordinates.x) < 100 && Math.abs(t.coordinates.y - table.coordinates.y) < 100).length !== 0
}

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(async () => {
    
    const layouts = await Layout.find({}).exec()

    for(const layout of layouts) {

        for(let i = 0; i < layout.tables.length; ++i) {
            if (layout.tables[i].tableSize === 'normal') {
                layout.tables[i].tableSize = 'average'
            }
    
            if (layout.tables[i].tableType === 'round') {
                layout.tables[i].tableType = 'rounded'
            }
    
            while(isOver(layout.tables[i], layout.tables)) {
                layout.tables[i].coordinates.x = faker.datatype.number({min: 60, max: 940})
                layout.tables[i].coordinates.y = faker.datatype.number({min: 60, max: 540})
            }
        }
    
        await layout.save()
    }


    await mongoose.connection.close()

})