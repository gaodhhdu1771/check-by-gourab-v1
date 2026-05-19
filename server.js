const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const expressMongoSanitize = require('express-mongo-sanitize');
const requestIp = require('request-ip');
const useragent = require('express-useragent');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

// Models & Middleware Setup
const User = require('./User'); // Root directory te thaka User Model
const Settings = require('./Settings'); // Root directory te thaka Settings Model
const adminAuth = require('./middleware/adminAuth'); // Middleware folder er adminAuth

dotenv.config();
const app = express();

// Security & Global Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // HTML features and external script elements easily run korar jonno
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(expressMongoSanitize());
app.use(requestIp.mw());
app.use(useragent.express());

// Static Files Serving
// 'public' directory ke frontend file serve korar jonno set kora holo
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://gourabadmin:gourab2006@cluster0.xiyfnuj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("=== MongoDB Connected Successfully ===");
        // Initial System Settings Create implicit setup
        const config = await Settings.findOne();
        if (!config) {
            await Settings.create({ isSiteActive: true, activeDB: 'primary', dbStatus: 'Good' });
            console.log("Default system settings initialized.");
        }
    })
    .catch(err => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });

// ==========================================
// 1. AUTHENTICATION SYSTEM INTERFACES
// ==========================================

// Register Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;

        if (!name || !phone || !email || !password) {
            return res.status(400).json({ error: "অনুগ্রহ করে সব তথ্য পূরণ করুন।" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ error: "এই ইমেইল অথবা ফোন নাম্বার দিয়ে ইতিপূর্বে অ্যাকাউন্ট খোলা হয়েছে।" });
        }

        // Password Hashing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // First user register hole take automatically admin banano hobe
        const userCount = await User.countDocuments();
        const role = (userCount === 0 || email === 'gourabmon112233@gmail.com') ? 'admin' : 'user';
        const status = (role === 'admin') ? 'Approved' : 'Pending';

        const newUser = new User({
            name,
            phone,
            email,
            password: hashedPassword,
            role,
            status,
            permissions: {
                activeCheckers: role === 'admin' ? [
                    'FB-Check', 'Pass-Pro', 'IP-Scan', 'Mail-Pro', 
                    'Dev-Scanner', 'Link-Safe', 'User-Hunt', 'Firewall'
                ] : [] // General user first setup a blank thakbe, admin approve korbe
            }
        });

        await newUser.save();
        return res.status(201).json({ message: "নিবন্ধন সফল হয়েছে! অনুগ্রহ করে অ্যাডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন।" });

    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({ error: "সার্ভার এরর! আবার চেষ্টা করুন।" });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "ইমেইল এবং পাসওয়ার্ড দিন।" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "ভুল ইমেইল অথবা পাসওয়ার্ড।" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "ভুল ইমেইল অথবা পাসওয়ার্ড।" });
        }

        // Check status block or pending logic
        if (user.status === 'Blocked') {
            return res.status(403).json({ error: "আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।" });
        }

        // Client Device Information track & capture
        const clientIp = req.clientIp || req.ip;
        const deviceType = req.useragent.isMobile ? "Mobile" : req.useragent.isDesktop ? "Desktop" : "Tablet";
        const os = req.useragent.os;
        const browser = req.useragent.browser;

        user.securityInfo = {
            lastLoginDate: new Date(),
            loginDevice: `${deviceType} (${os} - ${browser}) | IP: ${clientIp}`
        };
        await user.save();

        // Check redirect matrix path
        let redirectPath = '/dashboard.html';
        if (user.role === 'admin' || user.email === 'gourabmon112233@gmail.com') {
            redirectPath = '/admin-control.html';
        } else if (user.status === 'Pending') {
            redirectPath = '/dashboard.html'; // Dashboard handle korbe locked condition layout
        }

        return res.status(200).json({
            message: `স্বাগতম ${user.name}! লগইন সফল হয়েছে।`,
            userId: user._id,
            role: user.role,
            status: user.status,
            redirect: redirectPath
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ error: "সার্ভার লগইন প্রসেস এরর!" });
    }
});

// ==========================================
// 2. DASHBOARD ENGINE ENDPOINTS
// ==========================================

// Get Individual Dashboard Initialization Data
app.get('/api/dashboard/init', async (req, res) => {
    try {
        const userId = req.headers['userid'] || req.query.userId;
        if (!userId) {
            return res.status(401).json({ error: "ইউজার আইডি প্রয়োজন।" });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: "ব্যবহারকারী খুঁজে পাওয়া যায়নি।" });
        }

        const systemSettings = await Settings.findOne() || { isSiteActive: true, dbStatus: 'Good' };

        // 8 Ta unique structural checker module configuration definitions
        const availableTools = [
            { id: 'fb-check', name: 'FB-Check', icon: 'fa-brands fa-facebook' },
            { id: '2fa-slit', name: 'Pass-Pro', icon: 'fa-solid fa-key' },
            { id: 'geo-sync', name: 'IP-Scan', icon: 'fa-solid fa-location-dot' },
            { id: 'mail-validator', name: 'Mail-Pro', icon: 'fa-solid fa-envelope' },
            { id: 'network-trace', name: 'Dev-Scanner', icon: 'fa-solid fa-terminal' },
            { id: 'link-safe', name: 'Link-Safe', icon: 'fa-solid fa-shield-halved' },
            { id: 'user-hunt', name: 'User-Hunt', icon: 'fa-solid fa-crosshairs' },
            { id: 'firewall', name: 'Firewall', icon: 'fa-solid fa-server' }
        ];

        // Process status matrix dynamically
        const toolsData = availableTools.map(tool => {
            let isLive = false;
            // Site global dynamic state condition setup active checks
            if (systemSettings.isSiteActive) {
                if (user.role === 'admin' || user.email === 'gourabmon112233@gmail.com') {
                    isLive = true;
                } else if (user.status === 'Approved' && user.permissions?.activeCheckers?.includes(tool.name)) {
                    isLive = true;
                }
            }
            return {
                id: tool.id,
                name: tool.name,
                icon: tool.icon,
                isLive: isLive
            };
        });

        return res.status(200).json({
            user: {
                name: user.name,
                role: user.role,
                status: user.status,
                securityInfo: user.securityInfo
            },
            systemStatus: systemSettings.dbStatus,
            tools: toolsData
        });

    } catch (err) {
        console.error("Dashboard Engine Init Error:", err);
        return res.status(500).json({ error: "ড্যাশবোর্ড ডেটা লোড করতে ব্যর্থ।" });
    }
});

// Serving direct access to tool files logic
app.get('/tools/:toolId.html', async (req, res) => {
    try {
        const userId = req.headers['userid'] || req.query.userId || req.cookies.userId;
        const toolId = req.params.toolId;

        // Custom validation serving verification flow rule mapping
        const toolLabelMap = {
            'fb-check': 'FB-Check', '2fa-slit': 'Pass-Pro', 'geo-sync': 'IP-Scan',
            'mail-validator': 'Mail-Pro', 'network-trace': 'Dev-Scanner',
            'link-safe': 'Link-Safe', 'user-hunt': 'User-Hunt', 'firewall': 'Firewall'
        };

        const currentLabel = toolLabelMap[toolId];
        if (!currentLabel) return res.status(404).send("Unknown Tool Request.");

        if (!userId) return res.redirect('/index.html?error=unauthorized');

        const user = await User.findById(userId);
        const systemSettings = await Settings.findOne();

        if (!systemSettings?.isSiteActive) return res.status(403).send("System is currently offline by Master Control.");

        const hasAccess = user && (
            user.role === 'admin' || 
            user.email === 'gourabmon112233@gmail.com' ||
            (user.status === 'Approved' && user.permissions?.activeCheckers?.includes(currentLabel))
        );

        if (hasAccess) {
            return res.sendFile(path.join(__dirname, 'public', 'tools', `${toolId}.html`));
        } else {
            return res.status(403).send("<h1>Access Denied! Ask Gourab for Access License Permission.</h1>");
        }
    } catch (e) {
        return res.status(500).send("Internal Routing Error Setup Stack.");
    }
});

// ==========================================
// 3. ADMIN MANAGEMENT OPERATIONS (SECURE)
// ==========================================

// Get List of All System Registered Users
app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        return res.status(200).json({ users });
    } catch (err) {
        return res.status(500).json({ error: "ইউজার তালিকা আনতে ব্যর্থ।" });
    }
});

// Manage User Status and Assign Tool Permissions Checklist
app.post('/api/admin/manage-user', adminAuth, async (req, res) => {
    try {
        const { userId, status, checkers } = req.body;

        if (!userId || !status) {
            return res.status(400).json({ error: "প্রয়োজনীয় প্যারামিটার অনুপস্থিত।" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ error: "ইউজার খুঁজে পাওয়া যায়নি।" });
        }

        // Prevent modifying own structural profile admin node safely
        if (targetUser.email === 'gourabmon112233@gmail.com') {
            return res.status(403).json({ error: "মূল অ্যাডমিন প্রোফাইল মডিফাই করা অসম্ভব।" });
        }

        targetUser.status = status;
        if (checkers && Array.isArray(checkers)) {
            targetUser.permissions.activeCheckers = checkers;
        }

        await targetUser.save();
        return res.status(200).json({ message: "ইউজার ডাটাবেজ পারমিশন সফলভাবে আপডেট করা হয়েছে।" });

    } catch (err) {
        console.error("Admin Manage Error Operations:", err);
        return res.status(500).json({ error: "অ্যাকশন সম্পন্ন করতে সার্ভার ব্যর্থ হয়েছে।" });
    }
});

// Update Global Application Security Settings Context
app.post('/api/admin/update-settings', adminAuth, async (req, res) => {
    try {
        const { isSiteActive, dbStatus } = req.body;
        
        const systemConfig = await Settings.findOne() || new Settings();
        
        if (typeof isSiteActive !== 'undefined') systemConfig.isSiteActive = isSiteActive;
        if (dbStatus) systemConfig.dbStatus = dbStatus;

        await systemConfig.save();
        return res.status(200).json({ message: "সিস্টেম গ্লোবাল কনফিগারেশন আপডেট সম্পন্ন হয়েছে।" });
    } catch (err) {
        return res.status(500).json({ error: "সিস্টেম সেটিংস পরিবর্তন ব্যর্থ।" });
    }
});

// Fallback Wildcard Error Handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server Initialization
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Check By Gourab Server Is Active On Port: ${PORT}`);
    console.log(`🔒 Mode: High Secure Production Architecture`);
    console.log(`=================================================\n`);
});
