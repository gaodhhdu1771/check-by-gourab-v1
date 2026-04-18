const mongoose = require('mongoose');
const SettingsSchema = new mongoose.Schema({
    isSiteActive: { type: Boolean, default: true },
    activeDB: { type: String, default: 'primary' },
    dbStatus: { type: String, default: 'Good' }
});

module.exports = mongoose.model('Settings', SettingsSchema);
