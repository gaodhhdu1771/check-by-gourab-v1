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

// --- ২. ডাবল ডাটাবেস ও অ্যাডমিন কন্ট্রোল লজিক ---
const dbLinks = {
    primary: "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority",
    backup: "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority"
};

// ডাটাবেস কানেক্ট করার ফাংশন
const connectToDB = async (type = 'primary') => {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(dbLinks[type]);
        console.log(`✅ Connected to ${type.toUpperCase()} Database`);
        return true;
    } catch (err) {
        console.log(`❌ ${type} Connection Failed!`);
        return false;
    }
};

// সাইট চালু হলে ডিফল্ট ডাটাবেস কানেক্ট করবে
connectToDB('primary').then(async () => {
    let settings = await Settings.findOne();
    if (!settings) await Settings.create({ 
        isSiteActive: true, 
        activeDB: 'primary',
        dbStatus: 'Good'
    });
});

// --- ৩. এপিআই রাউটস ---

// লগইন লজিক + স্পিড মনিটর
app.post('/api/auth/login', async (req, res) => {
    try {
        const startTime = Date.now(); // সময় গণনা শুরু
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        const responseTime = Date.now() - startTime; // কত সময় লাগলো
        
        // যদি ডাটাবেস থেকে ডেটা আসতে ২ সেকেন্ডের বেশি লাগে, অ্যাডমিনকে এলার্ট দিবে
        if (responseTime > 2000) {
            await Settings.updateOne({}, { dbStatus: 'Slow! Change DB' });
        }

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "অ্যাকাউন্ট ব্লকড!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = req.useragent.platform + " (" + req.useragent.os + ")";
        await user.save();

        res.status(200).json({ 
            userId: user._id,
            redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html"
        });
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// [ADMIN ONLY] ডাটাবেস পরিবর্তনের রাউট
app.post('/api/admin/switch-db', async (req, res) => {
    const { dbType } = req.body; // 'primary' অথবা 'backup' পাঠাতে হবে
    const success = await connectToDB(dbType);
    
    if (success) {
        await Settings.updateOne({}, { activeDB: dbType, dbStatus: 'Good' });
        res.json({ message: `সফলভাবে ${dbType} ডাটাবেসে পরিবর্তন করা হয়েছে!` });
    } else {
        res.status(500).json({ error: "ডাটাবেস পরিবর্তন ব্যর্থ!" });
    }
});

// সিস্টেম স্ট্যাটাস চেক (অ্যাডমিন প্যানেলের জন্য)
app.get('/api/admin/system-info', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json({
            currentDB: settings?.activeDB || 'primary',
            status: settings?.dbStatus || 'Unknown',
            siteActive: settings?.isSiteActive
        });
    } catch (err) {
        res.status(500).json({ error: "তথ্য আনতে সমস্যা!" });
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
            securityInfo: { loginDevice: req.useragent.platform }
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল!" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ!" });
    }
});

// ক্যাচ-অল রাউট (সবশেষে থাকবে)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Hybrid Active on ${PORT}`));
