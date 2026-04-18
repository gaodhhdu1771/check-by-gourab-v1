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

// ✅ ১. অ্যাডমিন মিডলওয়্যার ইম্পোর্ট করা
const adminAuth = require('./middleware/adminAuth');

const app = express();

// মডেল লোড করা
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

// ✅ অটোমেটিক স্ট্যাটিক পাথ ডিটেকশন
const publicPath1 = path.join(__dirname, 'public', 'public');
const publicPath2 = path.join(__dirname, 'public');

if (fs.existsSync(publicPath1)) {
    app.use(express.static(publicPath1));
} else {
    app.use(express.static(publicPath2));
}

// --- ডাটাবেস কানেকশন ---
const dbUri = process.env.MONGODB_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(dbUri)
    .then(() => console.log("✅ Database Connected Successfully"))
    .catch(err => console.log("❌ DB Connection Error:", err));

// --- ১. লগইন এপিআই ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // স্পেশাল অ্যাডমিন আইডি (তোমার দেওয়া ইমেইল ও পাসওয়ার্ড)
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
                    permissions: { activeCheckers: ["FB-Check", "Pass-Pro", "IP-Scan", "Mail-Pro", "Dev-Scanner", "Link-Safe", "User-Hunt", "Firewall"] }
                });
                await adminUser.save();
            }
            return res.json({ userId: adminUser._id, role: 'admin', redirect: "/admin-control.html" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি! রেজিস্ট্রেশন করুন।" });

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
        if (existingUser) return res.status(400).json({ error: "ইমেইলটি অলরেডি আছে!" });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending', role: 'user',
            permissions: { 
                activeCheckers: [] // শুরুতে কোনো টুলস এক্সেস থাকবে না, অ্যাডমিন পরে দিবে
            }
        });

        await newUser.save();
        res.status(201).json({ message: "Success", userId: newUser._id });
    } catch (err) { 
        res.status(500).json({ error: "রেজিস্ট্রেশন ব্যর্থ!" }); 
    }
});

// ✅ ৩. অ্যাডমিন প্যানেল এপিআই (adminAuth দিয়ে সুরক্ষিত) ---

// সকল ইউজার লিস্ট দেখা
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "ইউজার লিস্ট লোড করা যায়নি!" });
    }
});

// ইউজার স্ট্যাটাস ও টুলস আপডেট করা
app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { userId, status, checkers } = req.body;
        await User.findByIdAndUpdate(userId, { 
            status: status, 
            'permissions.activeCheckers': checkers 
        });
        res.json({ message: "ইউজার সফলভাবে আপডেট হয়েছে!" });
    } catch (err) {
        res.status(500).json({ error: "আপডেট ব্যর্থ হয়েছে!" });
    }
});

// ডাইরেক্ট অ্যাকাউন্ট ক্রিয়েটর
app.post('/api/admin/create-account', adminAuth, async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({
            name: role === 'admin' ? "Direct Admin" : "Direct User",
            email: email, password: hashedPassword, role: role, status: 'Approved', 
            permissions: { activeCheckers: [] }
        });
        await newUser.save();
        res.json({ message: "Account created successfully" });
    } catch (err) {
        res.status(500).json({ error: "ইমেইলটি সম্ভবত আগে থেকেই আছে!" });
    }
});

// --- ৪. প্রোফাইল এপিআই ---
app.get('/api/user/profile', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID missing" });
        const user = await User.findById(userId).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).send(err);
    }
});

// --- ৫. ফাইল রাউটিং ---
app.get('*', (req, res) => {
    const checkPaths = [
        path.join(__dirname, 'public', 'public', 'login.html'),
        path.join(__dirname, 'public', 'login.html'),
        path.join(__dirname, 'login.html')
    ];

    let fileSent = false;
    for (const filePath of checkPaths) {
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
            fileSent = true;
            break;
        }
    }

    if (!fileSent) {
        res.status(404).send("মেইন ফাইল পাওয়া যায়নি। পাথ চেক করুন।");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gourab System Live on Port ${PORT}`);
});
