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

app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());

// তোমার ডাবল ফোল্ডার স্ট্রাকচারের সাথে মিল রেখে পাথ সেট করা হয়েছে
app.use(express.static(path.join(__dirname, 'public/public')));

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
        console.log(`❌ Connection Failed!`);
        return false;
    }
};

connectToDB('primary');

// এপিআই রাউটস
app.get('/api/user/profile', async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await User.findById(userId).select('-password');
        res.json(user);
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "Blocked" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Wrong Password" });

        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = `${req.useragent.platform} (${req.useragent.os})`;
        await user.save();

        res.json({ userId: user._id, role: user.role, redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html" });
    } catch (err) { res.status(500).send(err); }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            permissions: { activeCheckers: ["mail-validator", "fb-slit", "tg-slit", "2fa-slit", "geo-sync", "data-reporter", "network-trace", "time-smary"] }
        });
        await newUser.save();
        res.status(201).json({ message: "Success" });
    } catch (err) { res.status(400).send(err); }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
