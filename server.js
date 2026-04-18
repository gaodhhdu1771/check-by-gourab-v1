const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

// অ্যাডমিন মিডলওয়্যার ইম্পোর্ট (পাথ চেক করে নিও)
const adminAuth = require('./middleware/adminAuth');
const User = require('./User');

const app = express();

// --- মিডলওয়্যার ---
app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());

// স্ট্যাটিক ফাইল পাথ ঠিক করা (রেন্ডারের জন্য)
app.use(express.static(path.join(__dirname, 'public')));

// --- ডাটাবেস কানেকশন ---
const dbUri = process.env.MONGODB_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(dbUri)
    .then(() => console.log("✅ Database Connected"))
    .catch(err => console.log("❌ DB Error:", err));

// ১. ড্যাশবোর্ডের জন্য ইউজার প্রোফাইল এপিআই
app.get('/api/user/me', async (req, res) => {
    try {
        const userId = req.headers['user-id']; 
        if (!userId) return res.status(401).json({ error: "লগইন নেই" });

        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: "ইউজার নেই" });

        // ব্লক চেক
        if (user.status === 'blocked') {
            return res.status(403).json({ error: "আপনি ব্লকড!" });
        }

        res.json(user);
    } catch (err) { res.status(500).json({ error: "সার্ভার এরর" }); }
});

// ২. লগইন এপিআই
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        if (user.status === 'Pending') {
            return res.json({ userId: user._id, redirect: "/pending.html" });
        }

        const redirectPath = (user.role === 'admin') ? "/admin-control.html" : "/dashboard.html";
        res.json({ userId: user._id, role: user.role, redirect: redirectPath });
    } catch (err) { res.status(500).json({ error: "সার্ভার এরর" }); }
});

// ৩. অ্যাডমিন কন্ট্রোল (এখানে adminAuth ব্যবহার করা হয়েছে)
app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { targetUserId, status, permissions } = req.body;
        await User.findByIdAndUpdate(targetUserId, { status, permissions });
        res.json({ message: "আপডেট সফল!" });
    } catch (err) { res.status(500).json({ error: "অ্যাডমিন কমান্ড ফেইল!" }); }
});

// মেইন ফাইল রাউটিং
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gourab System Live on Port ${PORT}`);
});
