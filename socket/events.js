const cookie = require('cookie')
const jwt = require('jsonwebtoken')

const events = io => {

    io.on('connection', (socket) => {
		
		const cookies = cookie.parse(socket.handshake.headers.cookie)
		if(cookies['Authorization']) {
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			socket.join('restaurant:' + restaurantId)
		}
        
		// User is joining to the live session and will be notified
        socket.on('join-restaurant', () => {
			const cookies = cookie.parse(socket.handshake.headers.cookie)
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			socket.join('restaurant:' + restaurantId)
			console.log(socket.rooms)
        })

        // Users will be notified, if a new guest arrives
        socket.on('new-guest', ({selectedTable, socketId}) => {
        })

		socket.on('guest-leaved', ({tableId}) => {
            console.log(tableId)
			const cookies = cookie.parse(socket.handshake.headers.cookie)
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			io.to(restaurantId).emit('guest-leaved', tableId)
        })

		socket.on('join-table', ({tableId}) => {
            console.log('Joined to table:', tableId)
            socket.join('table:' + tableId)
        })

		socket.on('leave-table', ({tableId}) => {
            console.log('Leaved table:', tableId)
            socket.leave('table:' + tableId)
        })

        socket.on('layout-modified', ({tables}) => {
			console.log('Modify tables')
			const cookies = cookie.parse(socket.handshake.headers.cookie)
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			socket.broadcast.to('restaurant:' + restaurantId).emit('layout-modified', tables)
		})

	socket.on('order-removed', ({tableId, name}) => {
	    socket.broadcast.to('table:' + tableId).emit('order-removed', name)
	})

	socket.on('order-added', ({tableId, name}) => {
	    console.log(name)
	    socket.broadcast.to('table:' + tableId).emit('order-added', name)
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
