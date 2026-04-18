const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    
    role: { 
        type: String, 
        enum: ['user', 'manager', 'admin'], 
        default: 'user' 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Blocked'], // 'Approved' ই সার্ভারে ব্যবহৃত হচ্ছে
        default: 'Pending' 
    },

    permissions: {
        canViewDashboard: { type: Boolean, default: true }, 
        activeCheckers: { 
            type: [String], 
            // ডিফল্টভাবে তোমার ৮টি টুলের আইডি এখানে সেট করা হলো
            default: [
                "mail-validator", "fb-slit", "tg-slit", "2fa-slit", 
                "geo-sync", "data-reporter", "network-trace", "admin-control"
            ] 
        }
    },

    securityInfo: { // server.js এর লজিকের সাথে মিল রেখে
        lastLoginDate: { type: Date },
        loginDevice: { type: String, default: "Unknown Device" }
    },

    systemMetrics: {
        lastEntry: { type: Date, default: Date.now },
        accessNode: { type: String, default: "0.0.0.0" }
    },

    invitedBy: { type: String, default: "Direct" }
}, {
    timestamps: true 
});

// অটোমেশন: ব্লক হলে এক্সেস বন্ধ
UserSchema.pre('save', function(next) {
    if (this.status === 'Blocked') {
        this.permissions.canViewDashboard = false;
        this.permissions.activeCheckers = [];
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
