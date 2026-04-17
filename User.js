const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // বেসিক ইনফরমেশন
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    
    // ডাইনামিক রোল সিস্টেম (অ্যাডমিন কন্ট্রোল)
    role: { 
        type: String, 
        enum: ['user', 'manager', 'admin'], 
        default: 'user' 
    },
    
    // অ্যাকাউন্ট এক্সেস স্ট্যাটাস (অ্যাডমিন প্যানেল থেকে কন্ট্রোল হবে)
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Blocked'], 
        default: 'Pending' 
    },

    // মেম্বারশিপ লেভেল
    isPremium: { 
        type: Boolean, 
        default: false 
    },
    membershipType: { 
        type: String, 
        default: "Free" 
    }, // Basic, Silver, Gold

    // অ্যাডভান্সড পারমিশন কন্ট্রোল (আপনার ৮টি চেকারের জন্য)
    permissions: {
        canViewDashboard: { 
            type: Boolean, 
            default: false 
        }, 
        viewAdminInfo: { 
            type: Boolean, 
            default: false 
        },
        // এখানে অ্যাডমিন প্যানেল থেকে পাঠানো চেকারগুলোর নাম সেভ হবে
        activeCheckers: { 
            type: [String], 
            default: [] 
        }, 
        lastAccessedTool: { 
            type: String, 
            default: "None" 
        }
    },

    // সিকিউরিটি ও ইনভাইটেশন ট্র্যাকিং
    securityInfo: {
        lastLoginDate: { 
            type: Date 
        },
        // ইউজার লগইন করলে তার ডিভাইসের নাম এখানে থাকবে (যেমন: Infinix Hot 50i)
        loginDevice: { 
            type: String, 
            default: "Unknown" 
        }, 
        accountNote: { 
            type: String, 
            default: "" 
        } 
    },

    invitedBy: { 
        type: String, 
        default: "Direct" 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

/**
 * মিডলওয়্যার: ইউজারের স্ট্যাটাস অনুযায়ী ড্যাশবোর্ড এক্সেস অটো কন্ট্রোল।
 * যদি স্ট্যাটাস 'Approved' হয়, তবেই ড্যাশবোর্ড এক্সেস true হবে।
 */
UserSchema.pre('save', function(next) {
    if (this.status === 'Approved') {
        this.permissions.canViewDashboard = true;
    } else {
        this.permissions.canViewDashboard = false;
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
