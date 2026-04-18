const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const bcrypt = require('bcryptjs');
const requestIp = require('request-ip'); 
const useragent = require('express-useragent'); 
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// মডেল ইমপোর্ট (নিশ্চিত করো User.js এবং Settings.js একই ফোল্ডারে আছে)
const User = require('./User');
const Settings = require('./Settings');

// --- ১. মিডলওয়্যার সেটআপ ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());

/**
 * গৌরব, তোমার গিটহাবে public/public/tools এভাবে আছে।
 * তাই আমরা মেইন স্ট্যাটিক ফোল্ডার হিসেবে 'public' কে ধরছি।
 */
app.use(express.static(path.join(__dirname, 'public')));

// --- ২. ডাটাবেস কানেকশন ---
const dbLinks = {
    primary: process.env.MONGODB_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority",
    backup: "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority"
};

const connectToDB = async (type = 'primary') => {
    try {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        await mongoose.connect(dbLinks[type]);
        console.log(`✅ Connected to ${type.toUpperCase()} DB`);
        return true;
    } catch (err) {
        console.log(`❌ ${type} DB Connection Failed!`);
        return false;
    }
};

connectToDB('primary');

// --- ৩. এপিআই রাউটস ---

// লগইন এপিআই
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "আপনার অ্যাকাউন্ট ব্লকড!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = `${req.useragent.platform} (${req.useragent.os})`;
        await user.save();

        res.status(200).json({ 
            userId: user._id,
            role: user.role,
            redirect: user.role === 'admin' ? "/public/admin-control.html" : "/public/dashboard.html"
        });
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// প্রোফাইল এপিআই
app.get('/api/user/profile', async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findById(userId).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "প্রোফাইল পাওয়া যায়নি" });
    }
});

// রেজিস্ট্রেশন এপিআই
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            permissions: { 
                activeCheckers: ["mail-validator", "fb-slit", "tg-slit", "2fa-slit", "geo-sync", "data-reporter", "network-trace", "time-smary"] 
            }
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল হয়েছে!" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ!" });
    }
});

// --- ৪. ফাইল পাথ হ্যান্ডলিং (খুবই গুরুত্বপূর্ণ) ---

/**
 * ক্যাচ-অল রাউট: ইউজার ভুল লিঙ্কে গেলে বা প্রথমে সাইটে ঢুকলে 
 * তাকে public/public/login.html ফাইলে পাঠিয়ে দেবে।
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/public', 'login.html'));
});

// রেন্ডার পোর্টের জন্য কনফিগারেশন
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gourab Core-V1 Live on Port ${PORT}`);
});

