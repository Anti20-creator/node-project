const cookie = require('cookie')
const jwt = require('jsonwebtoken')

const events = io => {

    io.on('connection', (socket) => {
	socket.join("61e841dff9b14b068743380b")


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

	socket.on('guest-leaved', ({tableId}) => {
            console.log(tableId)
	    const cookies = cookie.parse(socket.handshake.headers.cookie)
	    const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
	    io.to(restaurantId).emit('guest-leaved', tableId)
        })

	socket.on('join-table', ({tableId}) => {
            console.log('Joined to table:', tableId)
            socket.join(tableId)
        })

	socket.on('leave-table', ({tableId}) => {
            console.log('Leaved table:', tableId)
            socket.leave(tableId)
        })

        socket.on('layout-modified', ({tables}) => {
	    console.log('Modify tables')
	    const cookies = cookie.parse(socket.handshake.headers.cookie)
	    const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
	    console.log(restaurantId)
	    socket.broadcast.to(restaurantId).emit('layout-modified', tables)
	})

	socket.on('order-removed', ({tableId, name}) => {
	    socket.broadcast.to(tableId).emit('order-removed', name)
	})

	socket.on('order-added', ({tableId, name}) => {
	    console.log(name)
	    socket.broadcast.to(tableId).emit('order-added', name)
	})

	socket.on('join-appointment', () => {
	    const cookies = cookie.parse(socket.handshake.headers.cookie)
	    const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
	    console.log('Joined to appointments')
	    socket.join('appointment:' + restaurantId)
	})

	socket.on('leave-appointment', () => {
	    const cookies = cookie.parse(socket.handshake.headers.cookie)
	    const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
	    console.log('Leaved appointments')
	    socket.leave('appointment:' + restaurantId)
	})

	socket.on('new-appointment', () => {
	    const cookies = cookie.parse(socket.handshake.headers.cookie)
	    const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
	    console.log('New appointment')
	    socket.broadcast.to('appointment:' + restaurantId).emit('new-appointment')
	})

    })
}

module.exports = { events }
