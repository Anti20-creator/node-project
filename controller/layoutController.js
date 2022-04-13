const Layout = require('../models/LayoutModel')

class LayoutNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'LayoutNotFoundError'
    }
}

const findById = async(id) => {
    const layout = await Layout.findOne({RestaurantId: id}).exec()
    if(!layout) {
        throw new LayoutNotFoundError("layout-not-found")
    }

    return layout
}

const validateTables = (tables, sizeX, sizeY) => {
    for(const table of tables) {

        if(table.tableType !== 'wide') {

            switch(table.size) {

                case 'small': {
                    if(table.sizeX < 0 || table.sizeY < 0) return false

                    if(table.sizeX - 80 > sizeX || table.sizeY - 80 > sizeY) return false
                    break;
                }

                case 'average': {
                    if(table.sizeX < 0 || table.sizeY < 0) return false

                    if(table.sizeX - 100 > sizeX || table.sizeY - 100 > sizeY) return false
                    break;
                }

                case 'large': {
                    if(table.sizeX < 0 || table.sizeY < 0) return false

                    if(table.sizeX - 120 > sizeX || table.sizeY - 120 > sizeY) return false
                    break;
                }

                default: {
                    return false;
                    break;
                }
            }

        }else {

            switch(table.size) {
                
                case 'small': {
                    if(table.sizeX < 0 || table.sizeY < 0) return false

                    if(table.tableCount > 12) {
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 110 > sizeX || table.sizeY - 160 > sizeY) return false
                        }else{
                            if(table.sizeX - 160 > sizeX || table.sizeY - 110 > sizeY) return false
                        }
                    }else if(table.tableCount > 10) {
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 80 > sizeX || table.sizeY - 160 > sizeY) return false
                        }else{
                            if(table.sizeX - 160 > sizeX || table.sizeY - 80 > sizeY) return false
                        }
                    }else{
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 80 > sizeX || table.sizeY - 120 > sizeY) return false
                        }else{
                            if(table.sizeX - 120 > sizeX || table.sizeY - 80 > sizeY) return false
                        }
                    }

                    break;
                }
    
                case 'average': {

                    if(table.sizeX < 0 || table.sizeY < 0) return false

                    if(table.tableCount > 12) {
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 130 > sizeX || table.sizeY - 190 > sizeY) return false
                        }else{
                            if(table.sizeX - 190 > sizeX || table.sizeY - 130 > sizeY) return false
                        }
                    }else if(table.tableCount > 10) {
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 100 > sizeX || table.sizeY - 190 > sizeY) return false
                        }else{
                            if(table.sizeX - 190 > sizeX || table.sizeY - 100 > sizeY) return false
                        }
                    }else{
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 100 > sizeX || table.sizeY - 150 > sizeY) return false
                        }else{
                            if(table.sizeX - 150 > sizeX || table.sizeY - 100 > sizeY) return false
                        }
                    }

                    break;
                }
    
                case 'large': {
                    if(table.sizeX < 0 || table.sizeY < 0) return false


                    if(table.tableCount > 12) {
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 150 > sizeX || table.sizeY - 220 > sizeY) return false
                        }else{
                            if(table.sizeX - 220 > sizeX || table.sizeY - 150 > sizeY) return false
                        }
                    }else if(table.tableCount > 10) {
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 120 > sizeX || table.sizeY - 220 > sizeY) return false
                        }else{
                            if(table.sizeX - 220 > sizeX || table.sizeY - 120 > sizeY) return false
                        }
                    }else{
                        if(table.direction === 90 || table.direction === 270) {
                            if(table.sizeX - 120 > sizeX || table.sizeY - 180 > sizeY) return false
                        }else{
                            if(table.sizeX - 180 > sizeX || table.sizeY - 120 > sizeY) return false
                        }
                    }
                    break;
                }
    
                default: {
                    return false;
                    break;
                }

            }
        }
    }

    return true
}

module.exports = { findById, validateTables }