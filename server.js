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
const fs = require('fs');
require('dotenv').config();

// ১. মিডলওয়্যার ইম্পোর্ট
const adminAuth = require('./middleware/adminAuth');

const app = express();

// ২. মডেল লোড
const User = require('./User');

// --- মিডলওয়্যার সেটআপ ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());

// --- ৩. অটোমেটিক স্ট্যাটিক পাথ হ্যান্ডলার ---
// তোমার গিটহাবে 'public' এর ভেতর আরেকটা 'public' আছে, তাই আমরা সব চেক করবো
const paths = [
    path.join(__dirname, 'public', 'public'),
    path.join(__dirname, 'public'),
    path.join(__dirname)
];

paths.forEach(p => {
    if (fs.existsSync(p)) {
        app.use(express.static(p));
    }
});

// --- ৪. ডাটাবেস কানেকশন ---
const dbUri = process.env.MONGODB_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(dbUri)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// --- ৫. লগইন এপিআই ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

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
        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });

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

// --- ৬. রেজিস্ট্রেশন এপিআই ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "ইমেইলটি আগে থেকেই আছে!" });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending', role: 'user',
            permissions: { activeCheckers: [] }
        });

        await newUser.save();
        res.status(201).json({ message: "Success", userId: newUser._id });
    } catch (err) { 
        res.status(500).json({ error: "রেজিস্ট্রেশন ব্যর্থ!" }); 
    }
});

// --- ৭. অ্যাডমিন কন্ট্রোল এপিআই (adminAuth দিয়ে সুরক্ষিত) ---
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "ইউজার লোড ব্যর্থ!" });
    }
});

app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { userId, status, checkers } = req.body;
        await User.findByIdAndUpdate(userId, { status, 'permissions.activeCheckers': checkers });
        res.json({ message: "আপডেট সফল হয়েছে!" });
    } catch (err) {
        res.status(500).json({ error: "আপডেট ব্যর্থ!" });
    }
});

// --- ৮. ফাইল রাউটিং (স্মার্ট পাথ ডিটেকশন) ---
app.get('*', (req, res) => {
    const checkFiles = [
        path.join(__dirname, 'public', 'index.html'),
        path.join(__dirname, 'public', 'public', 'index.html'),
        path.join(__dirname, 'index.html')
    ];

    for (const file of checkFiles) {
        if (fs.existsSync(file)) {
            return res.sendFile(file);
        }
    }
    res.status(404).send("Gourab, index.html বা মেইন ফাইল পাওয়া যায়নি। গিটহাবের public ফোল্ডার চেক করো।");
});

// পোর্ট সেটআপ
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gourab System Live on Port ${PORT}`);
});
