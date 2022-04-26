const menu = require('./menu')
require('dotenv').config()
const mongoose = require('mongoose')
const { faker } = require('@faker-js/faker')
const bcrypt = require('bcrypt')

const User         = require('../models/UserModel')
const Restaurant   = require('../models/RestaurantModel')
const Table        = require('../models/TableModel')
const Appointment  = require('../models/AppointmentModel')
const Layout       = require('../models/LayoutModel')
const Menu         = require('../models/MenuModel')
const Informations = require('../models/InformationsModel')
const Invoices     = require('../models/InvoiceModel')

const generateOpeningTime = () => {
    return [
        {
                open: {
                    hours: "11",
                    minutes: "00"
                },
                close: {
                    hours: "23",
                    minutes: "00"
                }
        },
        {
                open: {
                    hours: "11",
                    minutes: "00"
                },
                close: {
                    hours: "05",
                    minutes: "00"
                }
        },
        {
                open: {
                    hours: "11",
                    minutes: "00"
                },
                close: {
                    hours: "24",
                    minutes: "00"
                }
        },
        {
                open: {
                    hours: "00",
                    minutes: "00"
                },
                close: {
                    hours: "18",
                    minutes: "00"
                }
        },
        {
                open: {
                    hours: "11",
                    minutes: "00"
                },
                close: {
                    hours: "04",
                    minutes: "00"
                }
        },
        {
                open: {
                    hours: "11",
                    minutes: "00"
                },
                close: {
                    hours: "04",
                    minutes: "00"
                }
        },
        {
                open: {
                    hours: "11",
                    minutes: "00"
                },
                close: {
                    hours: "23",
                    minutes: "00"
                }
        }
    ]
}

const createAdmin = async(index) => {
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync("123456", salt)

    const user = await User.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    email: `admin${index}@gmail.com`,
                    password: hashedPassword,
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
                    address: faker.address.streetAddress(),
                    timeBeforeLastAppointment: 60,
                    openingTimes: generateOpeningTime()
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
                x: faker.datatype.number({min: 60, max: 750}),
                y: faker.datatype.number({min: 60, max: 350})
            },
            tableCount: tableCounts[i],
            tableType: faker.random.arrayElement(['rounded', 'normal', 'wide']),
            size: faker.random.arrayElement(['small', 'average', 'large']),
            direction: faker.random.arrayElement([0, 90, 180, 270]),
            TableId: tables.insertedIds[i].toString(),
            localId: i
        }
        while(isOver(table, tableData)) {
            table.coordinates.x = faker.datatype.number({min: 60, max: 750})
            table.coordinates.y = faker.datatype.number({min: 60, max: 350})
        }
        tableData.push(table)

    }

    await Layout.collection.bulkWrite([
        {
            insertOne: {
                document: {
                    RestaurantId: restaurantId,
                    tables: tableData,
		    sizeX: 1000,
		    sizeY: 500
                }
            }
        }
    ])
    for(let i = 0; i < tableCount; ++i) {
        await createAppointments(restaurantId, tables.insertedIds[i].toString(), tableCounts[i])
    }
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

const createAppointments = async(restaurantId, tableId, tableCount) => {

    const appointmentCount = faker.datatype.number({min: 60, max: 100})

    for(let i = 0; i < appointmentCount; ++i) {

	const from = (new Date().addDays(2))
        const until = (new Date().addDays(35))
        const time = faker.date.between(from, until)
	time.setSeconds(0)
	time.setMilliseconds(0)

        await Appointment.collection.bulkWrite([
            {
                insertOne: {
                    document: {
                        RestaurantId: restaurantId,
                        TableId: tableId,
                        peopleCount: faker.datatype.number({min: 1, max: tableCount}),
                        date: time,
                        code: "1234",
                        email: faker.random.word() + '@gmail.com',
			confirmed: faker.datatype.boolean()
                    }
                }
            }
        ])
    }

    const from = (new Date().addDays(2))
    const until = (new Date().addDays(35))
    const time = faker.date.between(from, until)
    time.setSeconds(0)
    time.setMilliseconds(0)

    await Appointment.collection.bulkWrite([
            {
                insertOne: {
                    document: {
                        RestaurantId: restaurantId,
                        TableId: 'any',
                        peopleCount: faker.datatype.number({min: 1, max: 8}),
                        date: time,
                        code: "1234",
                        email: faker.random.word() + '@gmail.com',
			confirmed: false
                    }
                }
            }
    ])


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
    await Invoices.deleteMany({}).exec()
    

    const count = process.argv[process.argv.length - 1].includes('\\') ? 1 : Number(process.argv[process.argv.length - 1])
    for(let i = 0; i < count; ++i) {
        const restaurantId = await createAdmin(i)
        await createMenu(restaurantId).then(async () => {
            await createTables(restaurantId)
            console.log(`admin${i}@gmail.com created...`)
        })
    }

    await mongoose.connection.close()

})
