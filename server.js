const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const requestIp = require('request-ip'); 
const useragent = require('express-useragent'); 
require('dotenv').config();

const app = express();

// মডেল ইমপোর্ট
const User = require('./User');
const Settings = require('./Settings');

// --- ১. সিকিউরিটি এবং অ্যান্টি-ট্র্যাকিং মিডলওয়্যার ---
app.use(helmet({ 
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "no-referrer" } // থার্ড পার্টি ট্র্যাকিং বন্ধ করবে
}));

// গুগল এবং অন্যান্য বট যেন সাইট ইনডেক্স করতে না পারে
app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    next();
});

app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// --- ২. ডাটাবেস কানেকশন ---
const mongoURI = "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI)
    .then(async () => {
        console.log("✅ Gourab's Database Connected!");
        const checkSettings = await Settings.findOne();
        if (!checkSettings) {
            await Settings.create({});
            console.log("⚙️ Default Settings Created.");
        }
    })
    .catch(err => console.log("❌ DB Connection Error: ", err));

// --- ৩. এপিআই রাউটস ---

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, phone, email, 
            password: hashedPassword,
            status: 'Pending'
        });
        await newUser.save();
        res.status(201).json({ message: settings.registerSuccessMessage });
    } catch (err) {
        res.status(400).json({ error: "Registration failed! Email already exists." });
    }
});

// লগইন (ডিভাইস ট্র্যাকিং ও প্রিমিয়াম চেক সহ)
app.post('/api/auth/login', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (!settings.isSiteActive) {
            return res.status(403).json({ error: settings.maintenanceMessage });
        }
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "আপনার অ্যাকাউন্ট ব্লক করা হয়েছে!" });

        if (settings.isPremiumMode && !user.isPremium && user.role !== 'admin') {
            return res.status(402).json({ error: `Premium Only! Contact Admin: ${settings.paymentInfo}` });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        const loginLog = {
            email: user.email,
            ip: req.clientIp,
            browser: req.useragent.browser,
            os: req.useragent.os,
            platform: req.useragent.platform,
            time: new Date()
        };
        await Settings.updateOne({}, { $push: { visitorLogs: loginLog } });
        res.status(200).json({ 
            message: settings.loginWelcomeMessage, 
            role: user.role,
            redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html" 
        });
    } catch (err) {
        res.status(500).json({ error: "Server error!" });
    }
});

// অ্যাডমিন কন্ট্রোল API
app.post('/api/admin/update-settings', async (req, res) => {
    try {
        const updateData = req.body;
        await Settings.updateOne({}, updateData);
        res.status(200).json({ message: "সেটিংস আপডেট হয়েছে!" });
    } catch (err) {
        res.status(500).json({ error: "Update failed!" });
    }
});

// Default Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
