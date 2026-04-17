const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // UI ঝকঝকে রাখার জন্য সিএসএস এলাউ করা হলো
}));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(express.static('public'));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// MongoDB Connection
const mongoURI = "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Gourab's Database Connected!"))
    .catch(err => console.log("❌ DB Connection Error: ", err));

// Routes
// নিশ্চিত করুন আপনার 'routes' ফোল্ডারের ভেতর auth.js এবং admin.js ফাইল আছে
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// Default Route for UI
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));