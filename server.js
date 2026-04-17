const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const requestIp = require('request-ip'); // আইপি ট্র্যাকিং
const useragent = require('express-useragent'); // ডিভাইস ট্র্যাকিং
require('dotenv').config();

const app = express();

// মডেল ইমপোর্ট (নিশ্চিত করুন Settings.js এবং User.js আপনার মেইন ডিরেক্টরিতে আছে)
const User = require('./User');
const Settings = require('./Settings');

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI)
    .then(async () => {
        console.log("✅ Gourab's Database Connected!");
        // প্রথমবার চালানোর সময় ডিফল্ট সেটিংস তৈরি করা
        const checkSettings = await Settings.findOne();
        if (!checkSettings) {
            await Settings.create({});
            console.log("⚙️ Default Settings Created.");
        }
    })
    .catch(err => console.log("❌ DB Connection Error: ", err));

// --- API Routes ---

// ১. রেজিস্ট্রেশন (অ্যাডমিন কন্ট্রোল সহ)
app.post('/api/auth/register', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const { name, phone, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            name, phone, email, 
            password: hashedPassword,
            status: 'Pending' // ডিফল্টভাবে পেন্ডিং থাকবে
        });

        await newUser.save();
        res.status(201).json({ message: settings.registerSuccessMessage });
    } catch (err) {
        res.status(400).json({ error: "Registration failed! Email already exists." });
    }
});

// ২. লগইন (প্রিমিয়াম, সাইট অফ এবং ডিভাইস ট্র্যাকিং সহ)
app.post('/api/auth/login', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        
        // সাইট কি বন্ধ?
        if (!settings.isSiteActive) {
            return res.status(403).json({ error: settings.maintenanceMessage });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "আপনার অ্যাকাউন্ট ব্লক করা হয়েছে!" });

        // প্রিমিয়াম চেক
        if (settings.isPremiumMode && !user.isPremium && user.role !== 'admin') {
            return res.status(402).json({ error: `এটি প্রিমিয়াম সাইট। ব্যবহার করতে ${settings.premiumPrice} লাগবে। যোগাযোগ: ${settings.paymentInfo}` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        // ডিভাইস এবং আইপি ট্র্যাকিং লগ
        const loginLog = {
            email: user.email,
            ip: req.clientIp,
            browser: req.useragent.browser,
            os: req.useragent.os,
            platform: req.useragent.platform,
            time: new Date()
        };
        
        // অ্যাডমিন সেটিংসে লগ সেভ করা
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

// ৩. অ্যাডমিন কন্ট্রোল API (সেটিংস আপডেট করার জন্য)
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
