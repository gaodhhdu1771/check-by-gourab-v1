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

// --- ১. সিকিউরিটি ও মিডলওয়্যার ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// --- ২. ডাটাবেস লজিক ---
const dbLinks = {
    primary: "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority",
    backup: "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority"
};

const connectToDB = async (type = 'primary') => {
    try {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        await mongoose.connect(dbLinks[type]);
        console.log(`✅ Connected to ${type.toUpperCase()} Database`);
        return true;
    } catch (err) {
        console.log(`❌ ${type} Connection Failed!`);
        return false;
    }
};

connectToDB('primary').then(async () => {
    let settings = await Settings.findOne();
    if (!settings) await Settings.create({ isSiteActive: true, activeDB: 'primary', dbStatus: 'Good' });
});

// --- ৩. এপিআই রাউটস ---

// ইউজারের প্রোফাইল ডাটা (ড্যাশবোর্ড এটি কল করবে)
app.get('/api/user/profile', async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Error fetching profile" });
    }
});

// লগইন লজিক
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        if (user.status === 'Pending') return res.status(403).json({ error: "অ্যাকাউন্ট অনুমোদনের অপেক্ষায়!" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "অ্যাকাউন্ট ব্লকড!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = `${req.useragent.platform} (${req.useragent.os})`;
        await user.save();

        res.status(200).json({ 
            userId: user._id,
            name: user.name,
            role: user.role,
            redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html"
        });
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// [ADMIN] ইউজার পারমিশন ও স্ট্যাটাস আপডেট
app.post('/api/admin/update-user', async (req, res) => {
    try {
        const { targetUserId, status, activeCheckers } = req.body;
        // activeCheckers এখানে তোমার ৮টি টুলের আইডি ধারণ করবে
        const updatedUser = await User.findByIdAndUpdate(targetUserId, {
            status: status,
            'permissions.activeCheckers': activeCheckers
        }, { new: true });

        res.json({ success: true, message: "User Updated!" });
    } catch (err) {
        res.status(500).json({ error: "Update Failed" });
    }
});

// [ADMIN] সব ইউজারের লিস্ট দেখা
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            role: 'user',
            permissions: { activeCheckers: [] }, // ডিফল্টভাবে সব টুল অফ থাকবে
            securityInfo: { loginDevice: req.useragent.platform }
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল! এডমিন এপ্রুভ করলে লগইন করতে পারবেন।" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ! হয়তো ইমেইলটি আগে ব্যবহার হয়েছে।" });
    }
});

// ডাটাবেস পরিবর্তনের রাউট
app.post('/api/admin/switch-db', async (req, res) => {
    const { dbType } = req.body;
    const success = await connectToDB(dbType);
    if (success) {
        await Settings.updateOne({}, { activeDB: dbType, dbStatus: 'Good' });
        res.json({ message: `সফলভাবে ${dbType} ডাটাবেসে পরিবর্তন করা হয়েছে!` });
    } else {
        res.status(500).json({ error: "ডাটাবেস পরিবর্তন ব্যর্থ!" });
    }
});

// ক্যাচ-অল রাউট
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Hybrid Active on ${PORT}`));

