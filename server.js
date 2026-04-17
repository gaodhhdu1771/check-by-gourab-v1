const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs'); // পাসওয়ার্ড সিকিউরিটির জন্য
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, 
}));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());

// Static folder setup
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// MongoDB Connection
const mongoURI = "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI)
    .then(() => console.log("✅ Gourab's Database Connected!"))
    .catch(err => console.log("❌ DB Connection Error: ", err));

// --- User Schema & Model ---
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// --- Auth Routes (সরাসরি এখানে যোগ করা হলো) ---

// ১. রেজিস্ট্রেশন রাউট
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(400).json({ error: "Registration failed. Email might already exist." });
    }
});

// ২. লগইন রাউট
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Wrong password!" });

        res.status(200).json({ message: "Login successful!", redirect: "/dashboard.html" });
    } catch (err) {
        res.status(500).json({ error: "Server error during login." });
    }
});

// Default Route for UI
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
