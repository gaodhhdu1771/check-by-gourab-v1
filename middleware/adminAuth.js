const User = require('../User'); // এখানে '../models/User' ছিল, সেটা কমিয়ে '../User' করা হয়েছে

const adminAuth = async (req, res, next) => {
    try {
        // রিকোয়েস্ট থেকে userId চেক করা (Headers, Body বা Query থেকে)
        const userId = req.headers['userid'] || req.body.userId || req.query.userId;

        if (!userId) {
            return res.status(401).json({ error: "অ্যাক্সেস ডিনাইড! ইউজার আইডি প্রদান করা হয়নি।" });
        }

        const user = await User.findById(userId);

        // তোমার এডমিন ইমেইল চেক
        if (user && (user.role === 'admin' || user.email === 'gourabmon112233@gmail.com')) {
            next(); // অনুমতি দেওয়া হলো
        } else {
            res.status(403).json({ error: "অননুমোদিত! শুধুমাত্র গৌরব এটি অ্যাক্সেস করতে পারবে।" });
        }
    } catch (err) {
        res.status(500).json({ error: "সার্ভার অথোরাইজেশন এরর!" });
    }
};

module.exports = adminAuth;
