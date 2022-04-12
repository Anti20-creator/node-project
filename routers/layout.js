const express                                                 = require('express')
const router                                                  = express.Router()
const mongoose                                                = require('mongoose')
const Httpresponse                                            = require('../utils/ErrorCreator')
const RequestValidator                                        = require('../controller/bodychecker')
const LayoutController                                        = require('../controller/layoutController')
const Table                                                   = require('../models/TableModel')
const Appointment                                             = require('../models/AppointmentModel')
const multer                                                  = require('multer')
const path                                                    = require('path')
const fs                                                      = require('fs')
const {authenticateAccessToken, authenticateAdminAccessToken} = require("../middlewares/auth")
const { catchErrors }                                         = require('../utils/ErrorHandler')


router.post('/save', authenticateAdminAccessToken, catchErrors(async (req, res) => {

    const {newTables, removedTables, updatedTables} = RequestValidator.destructureBody(req, res, {newTables: 'object', removedTables: 'object', updatedTables: 'object'})

    const layout = await LayoutController.findById(req.user.restaurantId)

    if(removedTables.length > 0) {
        const askedForRemoveTables = await Table.collection.find({ 
            RestaurantId: req.user.restaurantId, 
            _id: { $in: removedTables.map(id => mongoose.Types.ObjectId(id))}
        }).toArray()
        
        if (askedForRemoveTables.filter(table => table.inLiveUse).length > 0) {
            return Httpresponse.Conflict(res, "remove-live-table")
        }

        const appointment = await Appointment.collection.findOne({
            RestaurantId: req.user.restaurantId, 
            TableId: { $in: removedTables.map(id => mongoose.Types.ObjectId(id))},
            confirmed: true,
            date: { $gt: new Date() }
        })

        if(appointment) {
            return Httpresponse.Conflict(res, "remove-booked-table")
        }
    }

    let resultTables = layout.tables.filter(x => !removedTables.includes(x)).slice()

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
        await dbTable.deleteOne({})
    }

    layout.tables = resultTables.filter(table => !removedTables.includes(table.TableId))
    await layout.save()

    return Httpresponse.OK(res, resultTables)
}))

router.get('/', authenticateAccessToken, catchErrors(async(req, res) => {

    const layout = await LayoutController.findById(req.user.restaurantId)

    return Httpresponse.OK(res, layout.tables)
}))

router.get('/data', authenticateAccessToken, catchErrors(async(req, res) => {

    const layout = await LayoutController.findById(req.user.restaurantId)

    return Httpresponse.OK(res, {sizeX: layout.sizeX, sizeY: layout.sizeY, image: layout.backgroundImage})
}))

router.get('/image', authenticateAccessToken, catchErrors(async(req, res) => {

    const layout = await LayoutController.findById(req.user.restaurantId)

    return Httpresponse.OK(res, 'https://192.168.31.214:4000/backgrounds/' + layout.backgroundImage)
}))

router.get('/:id', catchErrors(async(req, res) => {

    const { id } = RequestValidator.destructureParams(req, res, {id: 'string'})
    const layout = await LayoutController.findById(id)

    return Httpresponse.OK(res, layout.tables)
}))

const DIR = path.join(__dirname, '/../public/backgrounds/');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(!file)
		return;
        cb(null, DIR)
    },
    filename: (req, file, cb) => {
        cb(null, req.user.restaurantId + path.extname(file.originalname))
    }
});
var upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
	if (!file) {
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

router.post('/update', authenticateAdminAccessToken, upload.single('image'), catchErrors(async(req, res) => {

    const { sizeX, sizeY, sentImage, deleteImage, extName } = RequestValidator.destructureBody(req, res, {sizeX: 'number', sizeY: 'number', sentImage: 'string', deleteImage: 'string', extName: 'string'})

    const layout = await LayoutController.findById(req.user.restaurantId)

    if((sentImage == 'true' && layout.backgroundImage && layout.backgroundImage.split('.').length > 1 && layout.backgroundImage.split('.').pop() !== extName) || deleteImage == 'true') {
        try {
            fs.rmSync(path.join(__dirname, '/../public/backgrounds/', layout.backgroundImage))
        }catch(e) {}

    }

    layout.sizeX = sizeX; layout.sizeY = sizeY; 
    if(sentImage === 'true') {
        layout.backgroundImage = req.user.restaurantId + '.' + extName;
    }
    await layout.save()

    return Httpresponse.OK(res, "layout-updated")
}))

module.exports = router