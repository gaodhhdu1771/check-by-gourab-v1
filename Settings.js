constconst mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    isSiteActive: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    displayNotice: { type: String, default: "সার্ভার আপগ্রেড চলছে, দ্রুত ফিরছি।" },
    
    // ডাটাবেজ ম্যানেজমেন্ট
    activeDB: { 
        type: String, 
        enum: ['primary', 'backup'], 
        default: 'primary' 
    },
    dbStatus: { type: String, default: "Good" }, // 'Good', 'Slow', 'Down'

    billingConfig: {
        isPremiumEnabled: { type: Boolean, default: false },
        contactChannel: { type: String, default: "@gourab_tech" } 
    },
    
    interfaceText: {
        welcomeHeader: { type: String, default: "গৌরব কোর-ভি১ প্যানেলে স্বাগতম" },
        securityAlert: { type: String, default: "আপনার অ্যাকাউন্টটি রিভিউ করা হচ্ছে।" }
    },
    
    activityMetrics: {
        totalRequests: { type: Number, default: 0 },
        lastOptimized: { type: Date, default: Date.now }
    }
}, {
    timestamps: true 
});

SettingsSchema.pre('save', function(next) {
    this.activityMetrics.lastOptimized = Date.now();
    next();
});

module.exports = mongoose.model('Settings', SettingsSchema);

