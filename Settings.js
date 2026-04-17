const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // সাইট স্ট্যাটাস কন্ট্রোল
    isSiteActive: { type: Boolean, default: true },
    maintenanceMessage: { type: String, default: "সার্ভার আপগ্রেড চলছে, দ্রুত ফিরছি।" },
    
    // প্রিমিয়াম ও পেমেন্ট সিস্টেম (টাকা লুকানোর অপশন সহ)
    isPremiumMode: { type: Boolean, default: false },
    showPrice: { type: Boolean, default: false }, // এডমিন চাইলে টাকা দেখাবে, নাহলে ব্ল্যাঙ্ক
    premiumPrice: { type: String, default: "" }, 
    paymentInfo: { type: String, default: "পেমেন্ট এর জন্য টেলিগ্রামে যোগাযোগ করুন।" },
    telegramNumber: { type: String, default: "01944035239" }, // আপনার টেলিগ্রাম নম্বর
    
    // ডাইনামিক মেসেজ সিস্টেম (ইউনিক ইউআই এর জন্য)
    loginWelcomeMessage: { type: String, default: "গৌরব টেকনোলজি প্যানেলে আপনাকে স্বাগতম" },
    registerNotice: { type: String, default: "নতুন একাউন্ট করার জন্য সঠিক তথ্য প্রদান করুন।" },
    pendingWarning: { type: String, default: "নিরাপত্তার স্বার্থে আপনার একাউন্টটি রিভিউ করা হচ্ছে।" },
    
    // ইউজার ও অ্যাক্টিভিটি লগ (আইপি শব্দ হাইড করে অবজেক্ট হিসেবে রাখা)
    systemLogs: { type: [Object], default: [] },
    
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', SettingsSchema);
