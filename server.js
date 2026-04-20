const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Models & Middleware
const User = require('./User');
const adminAuth = require('./middleware/adminAuth');

const app = express();

// ====================== মিডলওয়্যার ======================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(express.static(path.join(__dirname, 'public')));

// ====================== API ROUTES ======================

// ১. রেজিস্ট্রেশন API (ভিডিওর সেই মডাল কানেকশন)
app.post('/api/auth/register', async (req, res) => {
    const { name, phone, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "এই জিমেইল আগে থেকেই আছে!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name, phone, email,
            password: hashedPassword,
            status: 'Pending', // ডিফল্ট পেন্ডিং থাকবে
            role: 'user'
        });

        await user.save();
        res.status(201).json({ message: "Registration Successful" });
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর!" });
    }
});

// ২. লগইন API (অ্যাডমিন মেসেজ লজিক সহ)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        if (user.status === 'Pending' && user.role !== 'admin') {
            return res.json({ userId: user._id, redirect: "/pending.html" });
        }

        // অ্যাডমিন হলে স্পেশাল মেসেজ পাঠানো হবে ফ্রন্টএন্ডে
        let welcomeMsg = "";
        if (user.role === 'admin') {
            welcomeMsg = `প্রিয় এডমিন আপনাকে স্বাগতম আপনার পেজে। আপনার পেজ আপনি এখান থেকে সঠিকভাবে পরিচালনা করতে পারেন।`;
        }

        const redirectPath = (user.role === 'admin') ? "/admin-control.html" : "/dashboard.html";
        
        res.json({ 
            userId: user._id, 
            role: user.role, 
            redirect: redirectPath,
            message: welcomeMsg 
        });
    } catch (err) {
        res.status(500).json({ error: "লগইন এরর" });
    }
});

// ৩. প্রোফাইল API
app.get('/api/user/me', async (req, res) => {
    try {
        const userId = req.headers['user-id'];
        const user = await User.findById(userId).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর" });
    }
});

// ====================== PROTECTED TOOLS ======================
// শুধু Admin বা অনুমোদিত ইউজাররা tools ফোল্ডারের ফাইল পাবে
app.get('/tools/:filename', adminAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public', 'tools', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('টুলটি খুঁজে পাওয়া যায়নি!');
    }
});

// ====================== ADMIN ACTIONS ======================
app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { targetUserId, status, checkers } = req.body;
        await User.findByIdAndUpdate(targetUserId, { 
            status, 
            permissions: { activeCheckers: checkers || [] } 
        });
        res.json({ message: "আপডেট সফল!" });
    } catch (err) {
        res.status(500).json({ error: "অ্যাডমিন কমান্ড ফেইল!" });
    }
});

// ====================== HTML ROUTES ======================
app.get('/admin-control.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-control.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pending.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pending.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ====================== SERVER START ======================
const DB_URI = process.env.MONGO_URI || "তোমার_ডাটাবেজ_লিংক";
mongoose.connect(DB_URI).then(() => {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Gourab System Live on Port ${PORT}`);
    });
});
