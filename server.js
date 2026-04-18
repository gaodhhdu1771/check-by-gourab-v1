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

const User = require('./User');
const Settings = require('./Settings');

// --- মিডলওয়্যার সেটআপ ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());

// ✅ সমাধান ১: তোমার গিটহাবের public/public ফোল্ডার অনুযায়ী স্ট্যাটিক পাথ
app.use(express.static(path.join(__dirname, 'public', 'public')));

// --- ডাটাবেস কানেকশন ---
const dbLinks = {
    primary: process.env.MONGODB_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority"
};

mongoose.connect(dbLinks.primary)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// --- ১. লগইন এপিআই ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // স্পেশাল অ্যাডমিন আইডি (গৌরব)
        if (email === "gourabmon112233@gmail.com" && password === "goUrab@2008") {
            let adminUser = await User.findOne({ email });
            if (!adminUser) {
                const hashedPassword = await bcrypt.hash(password, 12);
                adminUser = new User({
                    name: "Gourab Admin",
                    phone: "01700000000",
                    email: email,
                    password: hashedPassword,
                    status: 'Approved',
                    role: 'admin',
                    permissions: { activeCheckers: ["all"] }
                });
                await adminUser.save();
            }
            return res.json({ userId: adminUser._id, role: 'admin', redirect: "/admin-control.html" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি! দয়া করে নতুন করে রেজিস্ট্রেশন করুন।" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        if (user.status === 'Pending') {
            return res.json({ userId: user._id, role: user.role, redirect: "/pending.html" });
        } else if (user.status === 'Blocked') {
            return res.status(403).json({ error: "আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে!" });
        }

        const redirectPath = user.role === 'admin' ? "/admin-control.html" : "/dashboard.html";
        res.json({ userId: user._id, role: user.role, redirect: redirectPath });

    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর!" });
    }
});

// --- ২. রেজিস্ট্রেশন এপিআই ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "এই ইমেইল দিয়ে অলরেডি অ্যাকাউন্ট আছে!" });

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = new User({ 
            name,
            phone,
            email,
            password: hashedPassword,
            status: 'Pending', 
            role: 'user',
            permissions: { 
                // তোমার সেই ৮টি টুলের নাম এখানে দেওয়া হয়েছে
                activeCheckers: ["mail-validator", "fb-slit", "tg-slit", "2fa-slit", "geo-sync", "data-reporter", "network-trace", "time-smary"] 
            }
        });

        await newUser.save();
        res.status(201).json({ message: "Success", userId: newUser._id });
    } catch (err) { 
        res.status(500).json({ error: "রেজিস্ট্রেশন ব্যর্থ হয়েছে!" }); 
    }
});

// --- ৩. প্রোফাইল এপিআই ---
app.get('/api/user/profile', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID required" });
        
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: "User not found" });
        
        res.json(user);
    } catch (err) {
        res.status(500).send(err);
    }
});

// --- ৪. ফাইল রাউটিং (ক্যাচ-অল) ---
// ✅ সমাধান ২: রেন্ডারে ENOENT এরর দূর করার জন্য নিখুঁত পাথ লজিক
app.get('*', (req, res) => {
    const mainFile = path.join(__dirname, 'public', 'public', 'login.html');
    res.sendFile(mainFile, (err) => {
        if (err) {
            console.error("Path Error:", err);
            res.status(404).send("মেইন ফাইল পাওয়া যায়নি। পাথ চেক করুন।");
        }
    });
});

// সার্ভার স্টার্ট
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gourab System Live on Port ${PORT}`);
});
