const events = io => {

    io.on('connection', (socket) => {


        // User is joining to the live session and will be notified
        socket.on('join-live', ({restaurantId}, ack) => {
            socket.join(restaurantId)
            ack({
                status: "OK",
                message: "Joined to live view!"
            })
        })

        // Users will be notified, if a new guest arrives
        socket.on('notify-new-guest', ({tableId}, ack) => {
            console.log(tableId)
            ack({
                status: "OK",
                table: tableId
            })
        })


    })
}

module.exports = { events }