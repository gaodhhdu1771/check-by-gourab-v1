const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Middleware & Models
const adminAuth = require('./middleware/adminAuth');
const User = require('./User');

const app = express();

// ====================== মিডলওয়্যার ======================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());

// সব public ফাইল সার্ভ করবে (index.html, dashboard.html, CSS, JS ইত্যাদি)
app.use(express.static(path.join(__dirname, 'public')));

// ====================== PROTECTED TOOLS ======================
// শুধু Admin-ই tools অ্যাক্সেস করতে পারবে
app.get('/tools/:filename', adminAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public', 'tools', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Tool not found');
    }
});

// ====================== API Routes ======================

// User Profile API
app.get('/api/user/me', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) return res.status(401).json({ error: "লগইন নেই" });

        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ error: "ইউজার নেই" });

        if (user.status === 'blocked') {
            return res.status(403).json({ error: "আপনি ব্লকড!" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর" });
    }
});

// Login API
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
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর" });
    }
});

// Admin Manage User
app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { targetUserId, status, permissions, checkers } = req.body; // checkers যোগ করা হয়েছে
        await User.findByIdAndUpdate(targetUserId, { 
            status, 
            permissions: { activeCheckers: checkers || [] } 
        });
        res.json({ message: "আপডেট সফল!" });
    } catch (err) {
        res.status(500).json({ error: "অ্যাডমিন কমান্ড ফেইল!" });
    }
});

// ====================== HTML Routes (Optional) ======================
app.get('/admin-control.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-control.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/pending.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pending.html'));
});

// ====================== Catch-all Route (সবশেষে) ======================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====================== Server Start ======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gourab System Live on Port ${PORT}`);
});
