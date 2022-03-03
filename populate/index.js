const menu = require('./menu')
require('dotenv').config()
const mongoose = require('mongoose')
const { faker } = require('@faker-js/faker')

const User        = require('../models/UserModel')
const Restaurant  = require('../models/RestaurantModel')
const Table       = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout      = require('../models/LayoutModel')
const Menu        = require('../models/MenuModel')
const Informations= require('../models/InformationsModel')

const createAdmin = async(index) => {
    const user = await User.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    email: `admin${index}@gmail.com`,
                    password: "123456",
                    restaurantName: `Restaurant ${index}`,
                    fullName: `Admin ${index}`,
                    isAdmin: true
                }  
            }  
        }
    ])
    const userId = user.insertedIds[0]
    const foundUser = await User.findById(userId).exec()

    const restaurant = await Restaurant.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    ownerEmail: foundUser.email,
                    ownerId: foundUser._id.toString(),
                    secretPin: "123456",
                    restaurantName: foundUser.restaurantName
                }  
            }  
        }
    ])

    await Informations.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    RestaurantId: restaurant.insertedIds[0].toString(),
                    city: faker.address.city(),
                    postalCode: faker.address.zipCode(),
                    taxNumber: faker.datatype.number({min: 10000000000000, max: 1000000000000000}),
                    address: faker.address.streetAddress()
                }  
            }  
        }
    ])


    foundUser.restaurantId = restaurant.insertedIds[0].toString()
    await foundUser.save()

    return restaurant.insertedIds[0].toString()
}

const createMenu = async (restaurantId) => {

    const items = {}
    const icons = {}

    Object.keys(menu).map(category => {
        items[category] = {}
        icons[category] = menu[category].icon
        menu[category].items.map(item => {
            items[category][item] = {
                price: faker.datatype.number({min: 149, max: 499}) * 10,
                amount: (category === 'Üdítők' || category === 'Koktélok') ? 330 : 1,
                unit: (category === 'Üdítők' || category === 'Koktélok') ? 'ml' : 'db'
            }
        })
    })

    await Menu.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    RestaurantId: restaurantId,
                    items: items,
                    icons: icons
                }
            }
        }
    ])

}

const createTables = async(restaurantId) => {
    
    const tableCount = faker.datatype.number({min: 5, max: 10})
    const menu = await Menu.findOne({RestaurantId: restaurantId}).exec()
    
    const tables = await Table.collection.bulkWrite(
        Array.from(Array(tableCount)).map(idx => {
            const liveOrders = []
            const inLiveUse = faker.datatype.boolean()

            if(inLiveUse) {
                const itemsCount = faker.datatype.number({min: 1, max: 5})

                const categories = Object.keys(menu.items)

                for(let i = 0; i < itemsCount; ++i) {
                    const category = faker.random.arrayElement(categories)

                    const foods = Object.keys(menu.items[category])
                    const food = faker.random.arrayElement(foods)

                    liveOrders.push({
                        category,
                        name: food,
                        price: menu.items[category][food].price,
                        quantity: faker.datatype.number({min: 1, max: 10})
                    })
                }

            }
            return {
                insertOne: {
                    document: {
                        RestaurantId: restaurantId,
                        inLiveUse: inLiveUse,
                        liveOrders: liveOrders
                    }
                }
            }
        })
    )
    const tableCounts = Array.from(Array(tableCount)).map(idx => {
        return faker.datatype.number({min: 3, max: 8})
    })

    function isOver(table, tables) {
        return tables.filter(t => t.localId !== table.localId).filter(t => Math.abs(t.coordinates.x - table.coordinates.x) < 100 && Math.abs(t.coordinates.y - table.coordinates.y) < 100).length !== 0
    }

    const tableData = []
    for(let i = 0; i < tableCount; ++i) {
        const table = {
            coordinates: {
                x: faker.datatype.number({min: 60, max: 940}),
                y: faker.datatype.number({min: 60, max: 460})
            },
            tableCount: tableCounts[i],
            tableType: faker.random.arrayElement(['rounded', 'normal']),
            size: faker.random.arrayElement(['small', 'average', 'large']),
            direction: faker.random.arrayElement([0, 90, 180, 270]),
            TableId: tables.insertedIds[i].toString(),
            localId: i
        }
        while(isOver(table, tableData)) {
            table.coordinates.x = faker.datatype.number({min: 60, max: 940})
            table.coordinates.y = faker.datatype.number({min: 60, max: 460})
        }
        tableData.push(table)

    }

    await Layout.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    RestaurantId: restaurantId,
                    tables: tableData
                }
            }
        }
    ])
    for(let i = 0; i < tableCount; ++i) {
        await createAppointments(restaurantId, tables.insertedIds[i].toString(), tableCounts[i])
    }
}

const createAppointments = async(restaurantId, tableId, tableCount) => {

    const appointmentCount = faker.datatype.number({min: 20, max: 40})

    for(let i = 0; i < appointmentCount; ++i) {

        const now = new Date()

        await Appointment.collection.bulkWrite([
            {
                insertOne: {
                    document: {
                        RestaurantId: restaurantId,
                        TableId: tableId,
                        peopleCount: faker.datatype.number({min: 1, max: tableCount}),
                        day: new Date(new Date(now.setDate(now.getDate() + i))).toISOString().slice(0, 10),
                        time: new Date(new Date(now.setDate(now.getDate() + i))).toISOString(), 
                        code: "1234",
                        email: `guest${i}@gmail.com`
                    }
                }
            }
        ])

    }


}

console.log('Start populating...')

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(async () => {
    await User.deleteMany({}).exec()
    await Restaurant.deleteMany({}).exec()
    await Table.deleteMany({}).exec()
    await Appointment.deleteMany({}).exec()
    await Layout.deleteMany({}).exec()
    await Menu.deleteMany({}).exec()
    await Informations.deleteMany({}).exec()
    
    for(let i = 0; i < 10; ++i) {
        const restaurantId = await createAdmin(i)
        await createMenu(restaurantId).then(async () => {
            await createTables(restaurantId)
        })
    }

    await mongoose.connection.close()

})
