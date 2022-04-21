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
        })

		socket.on('guest-leaved', ({tableId}) => {
			const cookies = cookie.parse(socket.handshake.headers.cookie)
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			io.to(restaurantId).emit('guest-leaved', tableId)
        })

		socket.on('join-table', ({tableId}) => {
            socket.join('table:' + tableId)
        })

		socket.on('leave-table', ({tableId}) => {
            socket.leave('table:' + tableId)
        })

        socket.on('layout-modified', ({tables}) => {
			const cookies = cookie.parse(socket.handshake.headers.cookie)
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			socket.broadcast.to('restaurant:' + restaurantId).emit('layout-modified', tables)
		})

		socket.on('order-removed', ({tableId, name}) => {
			socket.broadcast.to('table:' + tableId).emit('order-removed', name)
		})

		socket.on('order-added', ({tableId, name}) => {
			socket.broadcast.to('table:' + tableId).emit('order-added', name)
		})

		socket.on('new-appointment', () => {
			const cookies = cookie.parse(socket.handshake.headers.cookie)
			const restaurantId = jwt.decode(cookies['Authorization'].split(' ')[1]).restaurantId
			socket.broadcast.to('restaurant:' + restaurantId).emit('new-appointment')
		})

    })
}

module.exports = { events }
