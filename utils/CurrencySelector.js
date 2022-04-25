const getCurrency = (currency) => {
    let result = ''
    switch(currency) {
        case 'EUR':
            result = '€'
            break
        case 'USD':
            result = '$'
            break
        case 'HUF':
            result = 'Ft'
            break
        default:
            break
    }
    return result
}

module.exports = { getCurrency }
