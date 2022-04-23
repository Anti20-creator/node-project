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
                    if(table.coordinates.x < 0 || table.coordinates.y < 0) return false

                    if(table.coordinates.x + 80 > sizeX || table.coordinates.y + 80 > sizeY) return false
                    break;
                }

                case 'average': {
                    if(table.coordinates.x < 0 || table.coordinates.y < 0) return false

                    if(table.coordinates.x + 100 > sizeX || table.coordinates.y + 100 > sizeY) return false
                    break;
                }

                case 'large': {
                    if(table.coordinates.x < 0 || table.coordinates.y < 0) return false

                    if(table.coordinates.x + 120 > sizeX || table.coordinates.y + 120 > sizeY) return false
                    break;
                }

                default: {
                    return false;
                }
            }

        }else {

            switch(table.size) {
                
                case 'small': {
                    if(table.coordinates.x < 0 || table.coordinates.y < 0) return false

                    if(table.tableCount > 12) {
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 110 > sizeX || table.coordinates.y + 160 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 160 > sizeX || table.coordinates.y + 110 > sizeY) return false
                        }
                    }else if(table.tableCount > 10) {
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 80 > sizeX || table.coordinates.y + 160 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 160 > sizeX || table.coordinates.y + 80 > sizeY) return false
                        }
                    }else{
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 80 > sizeX || table.coordinates.y + 120 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 120 > sizeX || table.coordinates.y + 80 > sizeY) return false
                        }
                    }

                    break;
                }
    
                case 'average': {

                    if(table.coordinates.x < 0 || table.coordinates.y < 0) return false

                    if(table.tableCount > 12) {
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 130 > sizeX || table.coordinates.y + 190 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 190 > sizeX || table.coordinates.y + 130 > sizeY) return false
                        }
                    }else if(table.tableCount > 10) {
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 100 > sizeX || table.coordinates.y + 190 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 190 > sizeX || table.coordinates.y + 100 > sizeY) return false
                        }
                    }else{
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 100 > sizeX || table.coordinates.y + 150 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 150 > sizeX || table.coordinates.y + 100 > sizeY) return false
                        }
                    }

                    break;
                }
    
                case 'large': {
                    if(table.coordinates.x < 0 || table.coordinates.y < 0) return false


                    if(table.tableCount > 12) {
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 150 > sizeX || table.coordinates.y + 220 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 220 > sizeX || table.coordinates.y + 150 > sizeY) return false
                        }
                    }else if(table.tableCount > 10) {
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 120 > sizeX || table.coordinates.y + 220 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 220 > sizeX || table.coordinates.y + 120 > sizeY) return false
                        }
                    }else{
                        if(table.direction === '90' || table.direction === '270') {
                            if(table.coordinates.x + 120 > sizeX || table.coordinates.y + 180 > sizeY) return false
                        }else{
                            if(table.coordinates.x + 180 > sizeX || table.coordinates.y + 120 > sizeY) return false
                        }
                    }
                    break;
                }
    
                default: {
                    return false;
                }

            }
        }
    }

    return true
}

module.exports = { findById, validateTables }