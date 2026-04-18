const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

const adminAuth = require('./middleware/adminAuth');
const User = require('./User');

const app = express();

// --- মিডলওয়্যার ---
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(express.static(path.join(__dirname, 'public')));

// --- ডাটাবেস কানেকশন ---
const dbUri = process.env.MONGODB_URI || "তোমার_কানেকশন_স্ট্রিং";
mongoose.connect(dbUri).then(() => console.log("✅ DB Connected")).catch(err => console.log(err));

// --- ১. ইউজারের নিজের তথ্য এবং পারমিশন চেক করার এপিআই ---
app.get('/api/user/me', async (req, res) => {
    try {
        // নোট: এখানে ক্লায়েন্ট সাইড থেকে হেডার বা কুলোর মাধ্যমে userId পাঠাতে হবে
        const userId = req.headers['user-id']; 
        if (!userId) return res.status(401).json({ error: "লগইন করুন" });

        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: "ইউজার নেই" });

        // যদি অ্যাডমিন তাকে ব্লক করে দেয়, তবে সাথে সাথে এক্সেস বন্ধ
        if (user.status !== 'approved' && user.role !== 'admin') {
            return res.status(403).json({ error: "আপনার এক্সেস বন্ধ করা হয়েছে", status: user.status });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর" });
    }
});

// --- ২. লগইন এপিআই ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        // স্ট্যাটাস চেক
        if (user.status === 'Pending') {
            return res.json({ userId: user._id, status: 'Pending', redirect: "/pending.html" });
        } else if (user.status === 'blocked') {
            return res.status(403).json({ error: "আপনাকে ব্লক করা হয়েছে!" });
        }

        const redirectPath = (user.role === 'admin') ? "/admin-control.html" : "/dashboard.html";
        res.json({ userId: user._id, role: user.role, status: user.status, redirect: redirectPath });
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর!" });
    }
});

// --- ৩. অ্যাডমিন কন্ট্রোল (ইউজার ম্যানেজমেন্ট) ---
app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { userId, status, permissions } = req.body; 
        // permissions হবে একটি অ্যারে যেমন: ["2fa-slit", "fb-check"]
        
        await User.findByIdAndUpdate(userId, { 
            status: status, // 'approved', 'blocked', 'Pending'
            permissions: permissions 
        });
        
        res.json({ message: "ইউজার আপডেট সফল!" });
    } catch (err) {
        res.status(500).json({ error: "আপডেট ব্যর্থ!" });
    }
});

// বাকি সব রাউট এবং সার্ভার লিসেনিং...
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Live on ${PORT}`));
