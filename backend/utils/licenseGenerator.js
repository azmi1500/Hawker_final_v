const crypto = require('crypto');

const generateLicenseKey = (shopName, duration) => {
    const prefix = shopName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    const random1 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const random2 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const random3 = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    return `${prefix}-${random1}-${random2}-${random3}`;
};

const calculateExpiryDate = (durationMonths) => {
    const date = new Date();
    date.setMonth(date.getMonth() + durationMonths);
    return date;
};

module.exports = { generateLicenseKey, calculateExpiryDate };