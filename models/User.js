// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    batch: {
        type: String,
        required: true,
    },
    selectedDistrict: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        
    },
    salt: {
        type: String,
    },
    otp: String,
    otpExpires: Date,
    profileImage: {
        type: String,
        default: '',
    }, // New field for profile image URL
    role: {
        type: String,
        required: true,
    },
    apikey:{ 
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.salt = salt;
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to match entered password with hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
