const {faker} = require('@faker-js/faker')

const data = {
    taxNumber: faker.datatype.number({min: 10000000, max: 1000000000}).toString(),
    address: faker.address.streetAddress(),
    city: faker.address.city(),
    postalCode: faker.address.zipCode(),
    phoneNumber: faker.phone.phoneNumber(),
    currency: 'HUF',
    openingTimes: [
        //Monday
        {
            open: {
                hours: "01",
                minutes: "00"
            },
            close: {
                hours: "00",
                minutes: "00"
            }
        },
        //Tuesday
        {
            open: {
                hours: "08",
                minutes: "00"
            },
            close: {
                hours: "16",
                minutes: "00"
            }
        },
        //Wednesday
        {
            open: {
                hours: "05",
                minutes: "30"
            },
            close: {
                hours: "20",
                minutes: "15"
            }
        },
        //Thursday
        {
            open: {
                hours: "08",
                minutes: "00"
            },
            close: {
                hours: "16",
                minutes: "00"
            }
        },
        //Friday
        {
            open: {
                hours: "12",
                minutes: "00"
            },
            close: {
                hours: "05",
                minutes: "00"
            }
        },
        //Saturday
        {
            open: {
                hours: "12",
                minutes: "00"
            },
            close: {
                hours: "02",
                minutes: "00"
            }
        },
        //Sunday
        {
            open: {
                hours: "05",
                minutes: "00"
            },
            close: {
                hours: "02",
                minutes: "00"
            }
        },
    ]
}


const validate = (openingTimes) => {
    const openingTimesClone = openingTimes.slice()
    for(let i = 0; i < openingTimesClone.length; ++i) {
        if(openingTimesClone[i].open.hours.length !== 2 || isNaN(openingTimesClone[i].open.hours)
            || openingTimesClone[i].open.minutes.length !== 2 || isNaN(openingTimesClone[i].open.minutes)
            || openingTimesClone[i].close.hours.length !== 2 || isNaN(openingTimesClone[i].close.hours)
            || openingTimesClone[i].close.minutes.length !== 2 || isNaN(openingTimesClone[i].close.minutes) 
            ) {
                console.log('anyád')
                return false
            }
    }
    openingTimesClone.push(openingTimesClone[0])
    for(let i = 1; i < openingTimesClone.length; ++i) {
        if( Number(openingTimesClone[i-1].open.hours) > Number(openingTimesClone[i-1].close.hours) || (
            Number(openingTimesClone[i-1].open.hours) === Number(openingTimesClone[i-1].close.hours) &&
            Number(openingTimesClone[i-1].open.minutes) > Number(openingTimesClone[i-1].close.minutes)
        ) ) {
            if( (Number(openingTimesClone[i].open.hours) < Number(openingTimesClone[i-1].close.hours) || (
                Number(openingTimesClone[i].open.hours) === Number(openingTimesClone[i-1].close.hours) && Number(openingTimesClone[i].open.minutes) < Number(openingTimesClone[i-1].close.minutes)
            )) && !((Number(openingTimesClone[i].open.hours) === Number(openingTimesClone[i].close.hours) && Number(openingTimesClone[i].open.minutes) === Number(openingTimesClone[i].close.minutes)) && Number(openingTimesClone[i].open.hours) === 0) ) {
                return false
            }
        }
    }

    return true
}

console.log(validate(Array.from(Array(7)).map(() => {return {
    "open": {"hours": "00", "minutes": "00"},
    "close": {"hours": "24", "minutes": "00"}
}})))

console.log(validate(data.openingTimes))