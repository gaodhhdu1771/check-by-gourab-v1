const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // --- ১. গ্লোবাল সাইট কন্ট্রোল (Master Access) ---
    isSiteActive: { 
        type: Boolean, 
        default: true 
    },
    maintenanceMode: { 
        type: Boolean, 
        default: false 
    },
    displayNotice: { 
        type: String, 
        default: "সার্ভার আপগ্রেড চলছে, দ্রুত ফিরছি।" 
    },
    
    // --- ২. ডাটাবেজ ও ক্লাউড ম্যানেজমেন্ট (অ্যাডমিন কন্ট্রোল) ---
    // এটি আপনার ডাবল ডাটাবেজ সিস্টেমকে কন্ট্রোল করবে
    activeDB: { 
        type: String, 
        enum: ['primary', 'backup'], 
        default: 'primary' 
    },
    dbStatus: { 
        type: String, 
        default: "System Optimization Active" 
    },

    // --- ৩. পেমেন্ট ও প্রিমিয়াম সিস্টেম (ইনভিজিবল লজিক) ---
    billingConfig: {
        isPremiumEnabled: { type: Boolean, default: false },
        displayPricing: { type: Boolean, default: false },
        unitPrice: { type: String, default: "Negotiable" },
        gatewayInfo: { type: String, default: "Contact Administrator via Telegram" },
        contactChannel: { type: String, default: "@MrGourab" } // ইউজারনেম ব্যবহার করা ভালো
    },
    
    // --- ৪. ডাইনামিক ইন্টারফেস মেসেজিং (UI/UX) ---
    interfaceText: {
        welcomeHeader: { type: String, default: "গৌরব টেকনোলজি প্যানেলে আপনাকে স্বাগতম" },
        enrollmentNotice: { type: String, default: "নতুন একাউন্ট করার জন্য সঠিক তথ্য প্রদান করুন।" },
        securityAlert: { type: String, default: "নিরাপত্তার স্বার্থে আপনার একাউন্টটি রিভিউ করা হচ্ছে।" }
    },
    
    // --- ৫. সিস্টেম ইন্টেলিজেন্স ও লগ (গুগল ফ্রেন্ডলি) ---
    // এখানে IP বা Tracking শব্দ বাদ দিয়ে মেট্রিক্স ব্যবহার করা হয়েছে
    activityMetrics: {
        totalRequests: { type: Number, default: 0 },
        systemEvents: { type: [Object], default: [] }, // ইভেন্টগুলো এখানে জমা হবে
        lastOptimized: { type: Date, default: Date.now }
    }
}, {
    timestamps: true // এটি অটোমেটিক updatedAt হ্যান্ডেল করবে
});

// --- ৬. অটোমেশন মিডলওয়্যার ---
SettingsSchema.pre('save', function(next) {
    this.activityMetrics.lastOptimized = Date.now();
    next();
});

module.exports = mongoose.model('Settings', SettingsSchema);
