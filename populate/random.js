const fetch = require('node-fetch')

const url = 'https://192.168.31.161:4000/api/appointments/book'

const data = () => {
    return {
        'restaurantId': '620f9a5886305c45045c7966',
        'tableId': '620f9a5986305c45045c7968',
        'date': new Date().setUTCHours(12, 0, 0, 0),
        'email': 'specialguest@gmail.com',
        'peopleCount': 1
    }
}

fetch(url, {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify(data())
})
fetch(url, {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify(data())
})
fetch(url, {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify(data())
})
fetch(url, {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify(data())
})