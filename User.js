const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // --- ১. কোর আইডেন্টিটি ---
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        required: true,
        unique: true 
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
    
    // --- ২. অ্যাডমিন কন্ট্রোল সিস্টেম ---
    role: { 
        type: String, 
        enum: ['user', 'manager', 'admin'], 
        default: 'user' 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Blocked'], 
        default: 'Pending' 
    },

    // --- ৩. ডাইনামিক ড্যাশবোর্ড ও টুল কন্ট্রোল ---
    // শুরুতে সবাই সব পাবে (true), অ্যাডমিন চাইলে অফ করতে পারবে
    permissions: {
        canViewDashboard: { 
            type: Boolean, 
            default: true 
        }, 
        fullToolAccess: { 
            type: Boolean, 
            default: true 
        },
        activeCheckers: { 
            type: [String], 
            default: ["Tool1", "Tool2", "Tool3", "Tool4", "Tool5", "Tool6", "Tool7", "Tool8"] 
        },
        restrictedTools: { 
            type: [String], 
            default: [] 
        }
    },

    // --- ৪. প্রফেশনাল মেট্রিক্স (গুগল ফ্রেন্ডলি) ---
    systemMetrics: {
        lastEntry: { 
            type: Date, 
            default: Date.now 
        },
        clientEnvironment: { 
            type: String, 
            default: "Mobile-Client" 
        }, 
        accessNode: { 
            type: String, 
            default: "0.0.0.0" 
        },
        internalNote: { 
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
}, {
    timestamps: true 
});

/**
 * স্মার্ট অটোমেশন:
 * অ্যাডমিন যদি কাউকে 'Blocked' করে দেয়, তবে তার ড্যাশবোর্ড এক্সেস অটো বন্ধ হয়ে যাবে।
 */
UserSchema.pre('save', function(next) {
    if (this.status === 'Blocked') {
        this.permissions.canViewDashboard = false;
        this.permissions.fullToolAccess = false;
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
