const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'Pending' },
    permissions: {
        activeCheckers: { type: [String], default: [] }
    },
    securityInfo: {
        lastLoginDate: Date,
        loginDevice: String
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
