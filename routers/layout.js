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
    const newIds = []

    for (const updatedTable of updatedTables) {
        const idx = resultTables.findIndex(table => table.TableId === updatedTable.databaseID)
        resultTables[idx] = {...updatedTable, TableId: updatedTable.databaseID}
    }

    for (const newTable of newTables) {
        const table = await new Table({
            RestaurantId: req.user.restaurantId
        }).save()
        newIds.push(table._id)
        resultTables.push({
            ...newTable,
            TableId: table._id
        })
    }

    layout.tables = resultTables.filter(table => !removedTables.includes(table.TableId))
    if(!LayoutController.validateTables(layout.tables, layout.sizeX, layout.sizeY)) {
        for(const newId of newIds) {
            await Table.deleteOne({_id: newId})
        }
        return Httpresponse.BadRequest(res, "bad-layout-tables")
    }

    await layout.save()

    for(const table of removedTables) {
    	const dbTable = await Table.findOne({ _id: table }).exec()
        if(dbTable) await dbTable.deleteOne({})
    }

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


router.get('/:id/data', catchErrors(async(req, res) => {

    const { id } = RequestValidator.destructureParams(req, res, {id: 'string'})
    const layout = await LayoutController.findById(id)

    return Httpresponse.OK(res, {sizeX: layout.sizeX, sizeY: layout.sizeY, image: layout.backgroundImage})
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
            return cb(new Error('image-format-error'));
        }
    }
});

router.post('/update', authenticateAdminAccessToken, upload.single('image'), catchErrors(async(req, res) => {

    const { sizeX, sizeY, sentImage, deleteImage, extName } = RequestValidator.destructureBody(req, res, {sizeX: 'string', sizeY: 'string', sentImage: 'string', deleteImage: 'string', extName: 'string'})

    const layout = await LayoutController.findById(req.user.restaurantId)

    layout.sizeX = sizeX; layout.sizeY = sizeY;
    if(!LayoutController.validateTables(layout.tables, layout.sizeX, layout.sizeY)) {
        return Httpresponse.BadRequest(res, "bad-layout-sizes")
    }
    
    if((sentImage == 'true' && layout.backgroundImage && layout.backgroundImage.split('.').length > 1 && layout.backgroundImage.split('.').pop() !== extName) || deleteImage == 'true') {
        try {
            fs.rmSync(path.join(__dirname, '/../public/backgrounds/', layout.backgroundImage))
        }catch(e) {
            return Httpresponse.BadRequest(res, "layout-image-not-deleted")
        }
    }
    if(sentImage === 'true') {
        layout.backgroundImage = req.user.restaurantId + '.' + extName;
    }
    await layout.save()

    return Httpresponse.OK(res, "layout-updated")
}))

module.exports = router