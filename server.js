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

// --- ১. প্রিমিয়াম প্রোটেকশন ও বট ব্লক সিস্টেম ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

// সাইট স্ট্যাটাস চেক মিডলওয়্যার
app.use(async (req, res, next) => {
    try {
        const settings = await Settings.findOne();
        if (settings && !settings.isSiteActive) {
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        } else {
            res.setHeader('X-Robots-Tag', 'index, follow');
        }
    } catch (e) {}
    next();
});

app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// --- ২. ডাটাবেস কানেকশন (Render Environment Support) ---
// Render-এ সেট করা MONGO_URI ব্যবহার করবে, না থাকলে হার্ডকোড লিঙ্ক নিবে
const mongoURI = process.env.MONGO_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log("✅ Database Connected Successfully!");
    const settings = await Settings.findOne();
    if (!settings) await Settings.create({ isSiteActive: true });
})
.catch(err => {
    console.log("❌ MongoDB Connection Error:", err.message);
});

// --- ৩. আল্ট্রা এপিআই রাউটস ---

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            "securityInfo.loginDevice": req.useragent.platform + " (" + req.useragent.browser + ")"
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল! অ্যাডমিনের অনুমতির অপেক্ষা করুন।" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ! ইমেইল চেক করুন।" });
    }
});

// লগইন লজিক
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        
        if (user.status === 'Blocked') return res.status(403).json({ error: "Your account is permanently blocked!" });
        if (user.status === 'Pending') return res.status(403).json({ 
            error: "অ্যাকাউন্টটি রিভিউতে আছে।",
            redirect: "/pending.html" 
        });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        // লগইন ডিভাইস আপডেট (আপনার Infinix Hot 50i ট্র্যাকিংয়ের জন্য)
        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = req.useragent.platform + " - " + req.useragent.os;
        await user.save();

        const settings = await Settings.findOne();
        res.status(200).json({ 
            message: settings?.loginWelcomeMessage || "Welcome to Gourab Panel",
            userId: user._id,
            redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html"
        });
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// ইউজারের নিজস্ব প্রোফাইল ও পারমিশন দেখা
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

// --- ১. প্রিমিয়াম প্রোটেকশন ও বট ব্লক সিস্টেম ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

// সাইট স্ট্যাটাস চেক মিডলওয়্যার
app.use(async (req, res, next) => {
    try {
        const settings = await Settings.findOne();
        if (settings && !settings.isSiteActive) {
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        } else {
            res.setHeader('X-Robots-Tag', 'index, follow');
        }
    } catch (e) {}
    next();
});

app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// --- ২. ডাটাবেস কানেকশন (নতুন লিঙ্ক আপডেট করা হয়েছে) ---
const mongoURI = process.env.MONGO_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
.then(async () => {
    console.log("✅ Database Connected Successfully!");
    let settings = await Settings.findOne();
    if (!settings) await Settings.create({ isSiteActive: true });
})
.catch(err => {
    console.log("❌ MongoDB Connection Error:", err.message);
});

// --- ৩. আল্ট্রা এপিআই রাউটস ---

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            securityInfo: {
                loginDevice: req.useragent.platform + " (" + req.useragent.browser + ")"
            }
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল! অ্যাডমিনের অনুমতির অপেক্ষা করুন।" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ! ইমেইল চেক করুন।" });
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

// মডেল ইমপোর্ট (নিশ্চিত করুন আপনার ফোল্ডারে User.js এবং Settings.js ফাইল আছে)
const User = require('./User');
const Settings = require('./Settings');

// --- ১. মিডলওয়্যার সেটিংস ---
app.use(compression()); 
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(mongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());
app.use(express.static(path.join(__dirname, 'public')));

// সাইট স্ট্যাটাস চেক
app.use(async (req, res, next) => {
    try {
        const settings = await Settings.findOne();
        if (settings && !settings.isSiteActive) {
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        } else {
            res.setHeader('X-Robots-Tag', 'index, follow');
        }
    } catch (e) {}
    next();
});

// --- ২. ডাটাবেস কানেকশন (নতুন লিঙ্ক আপডেট করা হয়েছে) ---
const mongoURI = process.env.MONGO_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.tyrqc0k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
.then(async () => {
    console.log("✅ Database Connected Successfully!");
    let settings = await Settings.findOne();
    if (!settings) await Settings.create({ isSiteActive: true });
})
.catch(err => {
    console.log("❌ MongoDB Connection Error:", err.message);
});

// --- ৩. এপিআই রাউটস ---

// রেজিস্ট্রেশন
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ 
            name, phone, email, password: hashedPassword,
            status: 'Pending',
            securityInfo: {
                loginDevice: req.useragent.platform + " (" + req.useragent.browser + ")"
            }
        });
        await newUser.save();
        res.status(201).json({ message: "আবেদন সফল! অ্যাডমিনের অনুমতির অপেক্ষা করুন।" });
    } catch (err) {
        res.status(400).json({ error: "রেজিস্ট্রেশন ব্যর্থ! ইমেইল চেক করুন।" });
    }
});

// লগইন লজিক
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ error: "ইউজার পাওয়া যায়নি!" });
        if (user.status === 'Blocked') return res.status(403).json({ error: "আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে!" });
        if (user.status === 'Pending') return res.status(403).json({ 
            error: "অ্যাকাউন্টটি এখনো পেন্ডিং আছে।",
            redirect: "/pending.html" 
        });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "ভুল পাসওয়ার্ড!" });

        // ডিভাইস ইনফো আপডেট (Infinix Hot 50i ট্র্যাকিং)
        user.securityInfo.lastLoginDate = new Date();
        user.securityInfo.loginDevice = req.useragent.platform + " - " + req.useragent.os;
        await user.save();

        const settings = await Settings.findOne();
        res.status(200).json({ 
            message: settings?.loginWelcomeMessage || "Welcome to Gourab Panel",
            userId: user._id,
            redirect: user.role === 'admin' ? "/admin-control.html" : "/dashboard.html"
        });
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// ইউজার প্রোফাইল
app.get('/api/user/me/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: "ইউজার পাওয়া যায়নি!" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "সার্ভারে সমস্যা!" });
    }
});

// অ্যাডমিন: ইউজার লিস্ট
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "ডাটা আনতে ব্যর্থ!" });
    }
});

// অ্যাডমিন: ইউজার ম্যানেজমেন্ট
app.post('/api/admin/manage-user', async (req, res) => {
    try {
        const { userId, status, checkers } = req.body; 
        await User.findByIdAndUpdate(userId, { 
            status: status, 
            "permissions.activeCheckers": checkers 
        });
        res.json({ message: "ইউজার আপডেট সফল!" });
    } catch (err) {
        res.status(500).json({ error: "আপডেট ব্যর্থ!" });
    }
});

// সেটিংস গেট ও আপডেট
app.get('/api/admin/get-settings', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json(settings);
    } catch (e) { res.status(500).json({error: "Failed"}); }
});

app.post('/api/admin/update-settings', async (req, res) => {
    try {
        await Settings.updateOne({}, req.body);
        res.status(200).json({ message: "সেটিংস আপডেট সফল!" });
    } catch (err) {
        res.status(500).json({ error: "আপডেট ব্যর্থ!" });
    }
});

// ক্যাচ-অল রাউট: লগইন পেজে পাঠাবে
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// সার্ভার পোর্ট
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
