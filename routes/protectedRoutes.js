// routes/protectedRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const User = require('../models/User');

router.get('/profile', protect, async (req, res) => {
    console.log(req.user, "usersssssssssss");
    const userId = req.user._id;
    try {
        const userProfile = await User.findById(userId).select('-password -otp');
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }
         console.log(userProfile, "iserprofile APi")
        res.json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
