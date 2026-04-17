const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // ইউজার রোল (অ্যাডমিন চাইলে ম্যানেজার বা সাপোর্ট নিয়োগ দিতে পারবে)
    role: { 
        type: String, 
        enum: ['user', 'manager', 'support_admin', 'admin'], 
        default: 'user' 
    },
    
    // স্ট্যাটাস (অ্যাডমিন প্যানেল থেকে ব্লক বা অ্যাপ্রুভ করার জন্য)
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Blocked'], 
        default: 'Pending' 
    },

    // অ্যাডমিন যে পারমিশনগুলো কন্ট্রোল করবে
    permissions: {
        canBlock: { type: Boolean, default: false },
        canApprove: { type: Boolean, default: false },
        viewAdminInfo: { type: Boolean, default: false },
        
        // কোন ৮টি চেকার ইউজার দেখতে পারবে তার লিস্ট
        activeCheckers: { 
            type: [String], 
            default: ['Checker1', 'Checker2', 'Checker3', 'Checker4', 'Checker5', 'Checker6', 'Checker7', 'Checker8'] 
        }
    },

    // ইনভাইটেশন এবং রেফারেল ট্র্যাকিং
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
