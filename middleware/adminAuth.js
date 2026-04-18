const User = require('./User'); // তোমার ফাইল স্ট্রাকচার অনুযায়ী পাথ ঠিক করা হয়েছে

const adminAuth = async (req, res, next) => {
    try {
        // Headers (userid), Body বা Query থেকে আইডি নেওয়া
        const userId = req.headers['userid'] || req.headers['user-id'] || req.body.userId || req.query.userId;

        if (!userId) {
            return res.status(401).json({ error: "অ্যাক্সেস ডিনাইড! ইউজার আইডি নেই।" });
        }

        const user = await User.findById(userId);

        // ১. ডাটাবেজে রোল 'admin' হতে হবে 
        // ২. অথবা তোমার পার্সোনাল ইমেইল হতে হবে
        if (user && (user.role === 'admin' || user.email === 'gourabmon112233@gmail.com')) {
            next(); // গৌরব, তুমি ভেতরে যাওয়ার অনুমতি পেলে!
        } else {
            res.status(403).json({ error: "অননুমোদিত! এটি শুধুমাত্র গৌরবের জন্য সংরক্ষিত।" });
        }
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).json({ error: "সার্ভার অথোরাইজেশন এরর!" });
    }
};

module.exports = adminAuth;
