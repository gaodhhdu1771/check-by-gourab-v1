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

// গৌরব, এই লাইনটি তোমার ডাবল ফোল্ডার স্ট্রাকচারকে সাপোর্ট করবে
app.use(express.static(path.join(__dirname, 'public/public')));

const dbLinks = {
    primary: process.env.MONGODB_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority"
};

mongoose.connect(dbLinks.primary).then(() => console.log("✅ DB Connected"));

// --- লগইন এপিআই ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Wrong Password" });

        res.json({ userId: user._id, role: user.role, redirect: "/dashboard.html" });
    } catch (err) { res.status(500).send(err); }
});

// --- ফাইল পাঠানোর লজিক (খুবই গুরুত্বপূর্ণ) ---
app.get('*', (req, res) => {
    // এটি তোমার public/public ফোল্ডারের ভেতর login.html খুঁজবে
    const loginPath = path.join(__dirname, 'public/public', 'login.html');
    res.sendFile(loginPath, (err) => {
        if (err) {
            // যদি উপরে না পায়, তবে শুধু public ফোল্ডারে খুঁজবে
            res.sendFile(path.join(__dirname, 'public', 'login.html'));
        }
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
