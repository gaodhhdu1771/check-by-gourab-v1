const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // ইউজার রোল (অ্যাডমিন চাইলে কাউকে ম্যানেজার বানাতে পারবে)
    role: { 
        type: String, 
        enum: ['user', 'manager', 'admin'], 
        default: 'user' 
    },
    
    // অ্যাকাউন্ট স্ট্যাটাস (অ্যাডমিন ব্লক করলে সে আর ঢুকতে পারবে না)
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Blocked'], 
        default: 'Pending' 
    },

    // প্রিমিয়াম স্ট্যাটাস (টাকা দিয়েছে কি না)
    isPremium: { type: Boolean, default: false },

    permissions: {
        viewAdminInfo: { type: Boolean, default: false },
        // অ্যাডমিন যাকে যাকে পারমিশন দিবে সে সেই চেকার দেখবে
        activeCheckers: { type: [String], default: [] } 
    },

    // কে ইনভাইট করেছে তার রেকর্ড
    invitedBy: { type: String, default: "Direct" },
    
    // ইউজার কবে জয়েন করেছে
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
