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

// মডেল ইমপোর্ট
const User = require('./User');
const Settings = require('./Settings');

// --- ১. প্রিমিয়াম প্রোটেকশন ও বট ব্লক সিস্টেম ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

// সাইট স্ট্যাটাস চেক মিডলওয়্যার
app.use(async (req, res, next) => {
    try {
        const settings = await Settings.findOne();
        if (settings && !settings.isSiteActive) {
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        } else {
            res.setHeader('X-Robots-Tag', 'index, follow');
        }
    } catch (e) {}
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
        console.log("✅ Ultra Core Connected!");
        if (!(await Settings.findOne())) await Settings.create({});
    })
    .catch(err => console.log("❌ DB Error"));

// --- ৩. আল্ট্রা এপিআই রাউটস ---

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            "securityInfo.loginDevice": req.useragent.platform + " (" + req.useragent.browser + ")"
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল! অ্যাডমিনের অনুমতির অপেক্ষা করুন।" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ! ইমেইল চেক করুন।" });
    }
});

// লগইন লজিক
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        
        if (user.status === 'Blocked') return res.status(403).json({ error: "Your account is permanently blocked!" });
        if (user.status === 'Pending') return res.status(403).json({ 
            error: "অ্যাকাউন্টটি রিভিউতে আছে।",
            redirect: "/pending.html" 
        });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        // লগইন ডিভাইস ও আইপি আপডেট (আপনার Infinix Hot 50i ট্র্যাকিংয়ের জন্য)
        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = req.useragent.platform + " - " + req.useragent.os;
        await user.save();

        const settings = await Settings.findOne();
        res.status(200).json({ 
            message: settings.loginWelcomeMessage || "Welcome to Gourab Panel",
            userId: user._id, // ফ্রন্টএন্ডে প্রোফাইল টানার জন্য
            redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html"
        });
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// ইউজারের নিজস্ব প্রোফাইল ও পারমিশন দেখা (Dashboard-এর জন্য)
app.get('/api/user/me/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(404).json({ error: "User not found" });
    }
});

// অ্যাডমিন: সব ইউজার লিস্ট দেখা
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "ফেলড!" });
    }
});

// অ্যাডমিন: ৮টি চেকার ও স্ট্যাটাস ম্যানেজ করা
app.post('/api/admin/manage-user', async (req, res) => {
    try {
        const { userId, status, checkers } = req.body; 
        // আপনার নতুন মডেলে activeCheckers আপডেট করা
        await User.findByIdAndUpdate(userId, { 
            status: status, 
            "permissions.activeCheckers": checkers 
        });
        res.json({ message: "ইউজার পারমিশন আপডেট হয়েছে!" });
    } catch (err) {
        res.status(500).json({ error: "Update failed!" });
    }
});

// সেটিংস API
app.get('/api/admin/get-settings', async (req, res) => {
    const settings = await Settings.findOne();
    res.json(settings);
});

app.post('/api/admin/update-settings', async (req, res) => {
    try {
        await Settings.updateOne({}, req.body);
        res.status(200).json({ message: "সিস্টেম আপডেট সফল!" });
    } catch (err) {
        res.status(500).json({ error: "Update failed!" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Core Active on ${PORT}`));
