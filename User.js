const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // বেসিক ইনফরমেশন
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    
    // ডাইনামিক রোল সিস্টেম (অ্যাডমিন কন্ট্রোল)
    role: { 
        type: String, 
        enum: ['user', 'manager', 'admin'], 
        default: 'user' 
    },
    
    // অ্যাকাউন্ট এক্সেস স্ট্যাটাস (গুগল ফ্রেন্ডলি নাম)
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Blocked'], 
        default: 'Pending' 
    },

    // মেম্বারশিপ লেভেল
    isPremium: { type: Boolean, default: false },
    membershipType: { type: String, default: "Free" }, // Basic, Silver, Gold

    // অ্যাডভান্সড পারমিশন কন্ট্রোল
    permissions: {
        canViewDashboard: { type: Boolean, default: false }, // অ্যাপ্রুভ না হলে এটি false থাকবে
        viewAdminInfo: { type: Boolean, default: false },
        activeCheckers: { type: [String], default: [] }, // অ্যাডমিন যাকে যা পারমিশন দিবে
        lastAccessedTool: { type: String, default: "None" }
    },

    // সিকিউরিটি ও ইনভাইটেশন ট্র্যাকিং
    securityInfo: {
        lastLoginDate: { type: Date },
        loginDevice: { type: String, default: "Unknown" }, // আপনার Infinix Hot 50i এর মতো ডিভাইসের নাম থাকবে
        accountNote: { type: String, default: "" } // অ্যাডমিন চাইলে কোনো নোট লিখে রাখতে পারবে
    },

    invitedBy: { type: String, default: "Direct" },
    createdAt: { type: Date, default: Date.now }
});

// ইউজারের স্ট্যাটাস অনুযায়ী ড্যাশবোর্ড এক্সেস অটো কন্ট্রোল
UserSchema.pre('save', function(next) {
    if (this.status === 'Approved') {
        this.permissions.canViewDashboard = true;
    } else {
        this.permissions.canViewDashboard = false;
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
