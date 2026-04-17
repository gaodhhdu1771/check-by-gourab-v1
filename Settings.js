const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    isSiteActive: { type: Boolean, default: true },
    maintenanceMessage: { type: String, default: "সাইট বন্ধ আছে।" },
    isPremiumMode: { type: Boolean, default: false },
    premiumPrice: { type: String, default: "৫০০ টাকা" },
    paymentInfo: { type: String, default: "বিকাশ: ০১৯৪৪০৩৫২৩৯" },
    loginWelcomeMessage: { type: String, default: "স্বাগতম!" },
    registerSuccessMessage: { type: String, default: "রেজিস্ট্রেশন সফল!" },
    visitorLogs: { type: [Object], default: [] }
});

module.exports = mongoose.model('Settings', SettingsSchema);
