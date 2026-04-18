const User = require('../User');

const adminAuth = async (req, res, next) => {
    try {
        // রিকোয়েস্ট থেকে userId চেক করা
        const userId = req.headers['userid'] || req.body.userId || req.query.userId;

        if (!userId) {
            return res.status(401).json({ error: "অ্যাক্সেস ডিনাইড! ইউজার আইডি নেই।" });
        }

        const user = await User.findById(userId);

        // এখানে তোমার নিজের ইমেইলটি বসিয়ে দাও
        if (user && (user.role === 'admin' || user.email === 'তোমার-ইমেইল@gmail.com')) {
            next(); // যদি তুমি হও, তবে কাজ করতে দিবে
        } else {
            res.status(403).json({ error: "তুমি এই পেজের এডমিন নও!" });
        }
    } catch (err) {
        res.status(500).json({ error: "সার্ভার এরর!" });
    }
};

module.exports = adminAuth;
