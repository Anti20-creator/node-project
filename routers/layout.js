const express = require('express')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth")
const router = express.Router()
const mongoose = require('mongoose')

const Httpresponse = require('../utils/ErrorCreator')
const Table = require('../models/TableModel')
const Appointment = require('../models/AppointmentModel')
const Layout = require('../models/LayoutModel')

const multer = require('multer')
const path = require('path')
const fs = require('fs')

router.post('/save', authenticateAdminAccessToken, async (req, res) => {

    const {newTables, removedTables, updatedTables} = req.body

    const layout = await Layout.findOne({
        RestaurantId: req.user.restaurantId
    });
    if(!layout) {
        return Httpresponse.NotFound(res, "No layout found!")
    }

    console.log(removedTables)
    if(removedTables.length > 0) {
        const askedForRemoveTables = await Table.collection.find({ RestaurantId: req.user.restaurantId, _id: {
		$in: removedTables.map(id => mongoose.Types.ObjectId(id))
	}}).toArray()
        console.log('Asked for removal')
	console.log(askedForRemoveTables)
        if (askedForRemoveTables.filter(table => table.inLiveUse).length > 0) {
            return Httpresponse.Conflict(res, "You can't remove a table which is in live use!")
        }

        const appointments = await Appointment.collection.find({RestaurantId: req.user.restaurantId, TableId: {$in:
		removedTables.map(id => mongoose.Types.ObjectId(id))
	}}).toArray()
	console.log(appointments)
        if(appointments.filter(appointment => new Date() < new Date(appointment.day)).length > 0) {
            return Httpresponse.Conflict(res, "You can't remove a table which has booking for the future!")
        }
    }


    let resultTables = layout.tables.filter(x => !removedTables.includes(x)).slice();

    for (const updatedTable of updatedTables) {
        // Maybe we should check if the table exists
        const idx = resultTables.findIndex(table => table.TableId === updatedTable.databaseID)
        resultTables[idx] = {...updatedTable, TableId: updatedTable.databaseID}
    }

    for (const newTable of newTables) {
        const table = await new Table({
            RestaurantId: req.user.restaurantId
        }).save()
        resultTables.push({
            ...newTable,
            TableId: table._id
        })
    }

    for(const table of removedTables) {
	const dbTable = await Table.findOne({ _id: table }).exec()
	console.log(dbTable)
        await dbTable.deleteOne({})
	console.log(dbTable)
    }

    resultTables = resultTables.filter(table => !removedTables.includes(table.TableId))

    await layout.updateOne({
        tables: resultTables
    })
    //req.app.get('socketio').broadcast.to(req.user.restaurantId).emit('layout-modified', resultTables)

    return Httpresponse.OK(res, resultTables)
})

router.get('/', authenticateAccessToken, async(req, res) => {

    const layout = await Layout.findOne({RestaurantId: req.user.restaurantId}).exec();
    if(!layout) {
        return Httpresponse.NotFound(res, "No layout found!")
    }

    return Httpresponse.OK(res, layout.tables)

})

router.get('/data', authenticateAccessToken, async(req, res) => {

    const layout = await Layout.findOne({RestaurantId: req.user.restaurantId}).exec()
    console.log(req.user.restaurantId)

    if(!layout) {
	   return Httpresponse.NotFound(res, "No layout found!")
    }

    return Httpresponse.OK(res, {sizeX: layout.sizeX, sizeY: layout.sizeY, image: layout.backgroundImage})
})

router.get('/image', authenticateAccessToken, async(req, res) => {

    const layout = await Layout.findOne({RestaurantId: req.user.restaurantId}).exec()

    return Httpresponse.OK(res, 'https://192.168.31.214:4000/backgrounds/' + layout.backgroundImage)

})

router.get('/:id', async(req, res) => {

    const layout = await Layout.findOne({RestaurantId: req.params.id}).exec();
    if(!layout) {
        return Httpresponse.NotFound(res, "No layout found!")
    }

    return Httpresponse.OK(res, layout)

})

const DIR = path.join(__dirname, '/../public/backgrounds/');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(!file)
		return;
        cb(null, DIR)
    },
    filename: (req, file, cb) => {
	console.log('FILENAME')
        cb(null, req.user.restaurantId + path.extname(file.originalname))
    }
});
var upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
	if (!file) {
	    console.log('NO FILE')
	    return cb(new Error(''))
	}
	if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

router.post('/update', authenticateAdminAccessToken, upload.single('image'), async(req, res) => {

    const { sizeX, sizeY, sentImage, deleteImage, extName } = req.body

    const layout = await Layout.findOne({RestaurantId: req.user.restaurantId}).exec()

    if(!layout) {
	return Httpresponse.NotFound(res, "No tables found!")
    }
    console.log(deleteImage)
    console.log(deleteImage === 'true')
    console.log(deleteImage === true)
    if((sentImage == 'true' && layout.backgroundImage && layout.backgroundImage.split('.').length > 1 && layout.backgroundImage.split('.').pop() !== extName) || deleteImage == 'true') {
	try {
	     fs.rmSync(path.join(__dirname, '/../public/backgrounds/', layout.backgroundImage))
	}catch(e) {}

    }

    console.log(typeof sentImage)

    if(sentImage == 'true') {
	console.log('updating image')
	await layout.updateOne({
	    sizeX, sizeY, backgroundImage: req.user.restaurantId + '.' + extName
	})
    }else{
	await layout.updateOne({
	    sizeX, sizeX
        })
    }

    return Httpresponse.OK(res, "Layout size updated!")

})

module.exports = router
