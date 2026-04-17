const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'manager', 'support_admin', 'admin'], default: 'user' },
    status: { type: String, enum: ['Pending', 'Approved', 'Blocked'], default: 'Pending' },
    permissions: {
        canBlock: { type: Boolean, default: false },
        canApprove: { type: Boolean, default: false },
        viewAdminInfo: { type: Boolean, default: false },
        activeCheckers: [String]
    }
});
module.exports = mongoose.model('User', UserSchema);