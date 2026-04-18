const User = require('../User'); // এক ধাপ পেছনে গিয়ে User.js ফাইলটি খুঁজবে

const adminAuth = async (req, res, next) => {
    try {
        // রিকোয়েস্টের বিভিন্ন জায়গা থেকে ইউজার আইডি চেক
        const userId = req.headers['userid'] || req.headers['user-id'] || req.body.userId || req.query.userId;

        if (!userId) {
            return res.status(401).json({ error: "অ্যাক্সেস ডিনাইড! আইডি পাওয়া যায়নি।" });
        }

        const user = await User.findById(userId);

        // অ্যাডমিন ইমেইল এবং রোলের ডাবল চেক
        if (user && (user.role === 'admin' || user.email === 'gourabmon112233@gmail.com')) {
            next(); // গৌরবকে অনুমতি দেওয়া হলো
        } else {
            res.status(403).json({ error: "অননুমোদিত! এটি শুধুমাত্র গৌরবের কন্ট্রোল।" });
        }
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).json({ error: "অথোরাইজেশন এরর!" });
    }
};

module.exports = adminAuth;
