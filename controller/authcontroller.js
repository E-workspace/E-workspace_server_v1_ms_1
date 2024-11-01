    // controllers/authController.js
    const session = require('express-session');
    // controllers/authController.js
    const moment = require('moment'); // Import moment for date formatting
    const User = require('../models/User');
    const generateToken = require('../utils/generateToken');
    const sendEmail = require('../utils/sendEmail');
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    const cloudinary = require('../config/Cloudinary');
    const DailyTask = require('../models/Task')
    const Message = require('../models/Message');
    const fs = require('fs'); // Import the File System module



    exports.registerUser = async (req, res, next) => {
        try {
            const { username, email, password, role, batch, selectedDistrict, phoneNumber } = req.body;
            console.log(username, email, password, role, batch, selectedDistrict, phoneNumber, "register");
            const profileImageFile = req.file; // Assuming you're using multer to handle file upload
    
            // Check if the username already exists
            const usernameExists = await User.findOne({ username });
            if (usernameExists) {
                return res.status(400).json({ message: 'Username already taken' });
            }
    
            // Check if the email already exists
            const userExists = await User.findOne({ email });
            if (userExists) {
                return res.status(400).json({ message: 'User already exists' });
            }
    
            // Upload profile image to Cloudinary
            let profileImageUrl = '';
            if (profileImageFile) {
                const result = await cloudinary.uploader.upload(profileImageFile.path, {
                    folder: 'UserProfiles',
                });
                profileImageUrl = result.secure_url;
    
                // Delete the file from local storage after successful upload
                fs.unlink(profileImageFile.path, (err) => {
                    if (err) {
                        console.error('Failed to delete local file:', err);
                    } else {
                        console.log('Successfully deleted local file:', profileImageFile.path);
                    }
                });
            }
    
            // Generate a unique API Key
            const apiKey = crypto.randomBytes(32).toString('hex');
    
            const user = await User.create({
                username,
                email,
                password,
                profileImage: profileImageUrl,
                role,
                batch,
                selectedDistrict,
                phoneNumber,
                apikey: apiKey,
            });
    
            if (user) {
                const otp = crypto.randomBytes(3).toString('hex');
                const hashedOtp = await bcrypt.hash(otp, 10);
                user.otp = hashedOtp;
                await user.save();
    
                // Send email with OTP
                await sendEmail({
                    email: user.email,
                    subject: 'OTP for Email Verification',
                    message: `Your OTP is: ${otp}`,
                });
    
                res.status(201).json({ message: 'User registered, OTP sent to email' });
            } else {
                res.status(400);
                throw new Error('Invalid user data');
            }
        } catch (error) {
            next(error);
        }
    };
    


  exports.verifyOTP = async (req, res, next) => {
      try {
          const { email, otp } = req.body;
          const user = await User.findOne({ email });
          if (!user) {
              res.status(400);
              throw new Error('Invalid email');
          }
          const isMatch = await bcrypt.compare(otp, user.otp);
          if (!isMatch) {
              res.status(400);
              throw new Error('Invalid OTP');
          }
          user.isVerified = true;
          user.otp = undefined;
          await user.save();

          res.status(200).json({
              message: 'OTP verified, user is now verified',
              token: generateToken(user._id),
          });
      } catch (error) {
          next(error);
      }
  };

  exports.authUser = async (req, res, next) => {
      try {
          const { email, password } = req.body;
          console.log('Incoming login request:', { email, password }); // Add this line for logging
          const user = await User.findOne({ email });
          console.log(user, "user from auth controller")
          if (user && (await user.matchPassword(password))) {
              req.session.userId = user._id;
              req.session.username = user.username;
              req.session.save(); // Explicitly save the session
              console.log('Session Details:', req.session);

            res.json({
                  message: 'Login successful',
                  user: {
                      _id: user._id,
                      username: user.username,
                      email: user.email,
                      role: user.role,
                      apikey: user.apikey,
                      batch: user.batch,
                      selectedDistrict: user.selectedDistrict,
                      phoneNumber: user.phoneNumber,
                      profileImage : user.profileImage,

                  },
              });
          } else {
              res.status(401);
              throw new Error('Invalid email or password');
          }
      } catch (error) {
          next(error);
      }
  };

  // controllers/authController.js
  exports.logoutUser = (req, res) => {
      req.session.destroy((err) => {
          if (err) {
              console.error('Error destroying session:', err);
              return res.status(500).json({ message: 'Internal Server Error' });
          }
          res.clearCookie('connect.sid', {
              path: '/',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          });
          res.status(200).json({ message: 'Logout successful' });
      });
  };

  exports.getAllTasks = async (req, res) => {
      try {
        const tasks = await DailyTask.find();
        console.log(tasks, "taks")
        res.status(200).json(tasks);
      } catch (error) {
        res.status(500).json({ message: 'Error retrieving tasks', error });
      }
    };

    // controllers/authController.js

    exports.StoreTask = async (req, res) => {
      try {
        const { id, title, date, dueDate, technology,description,images, status ,hasViewedDescription} = req.body;
    
        // Check if the task with the same ID already exists
        const existingTask = await DailyTask.findOne({ id });
        if (existingTask) {
          return res.status(409).json({ message: 'Task already exists' });
        }
    
        // If task doesn't exist, create a new one
        const newTask = new DailyTask({  id, title, date, dueDate, technology,description,images, status ,hasViewedDescription});
        await newTask.save();
    
        res.status(201).json({ message: 'Task saved successfully', task: newTask });
      } catch (error) {
        console.error('Error saving task:', error);
        res.status(500).json({ message: 'Error saving task', error });
      }
    };
    
    exports.updateDescription = async (req, res) => {
      try {
        const { id } = req.body;
        console.log(id, "id from desc");
    
        // Find the task by its ID
        const existingTask = await DailyTask.findOne({ id });
    
        // If the task exists, update its status to 'Pending'
        if (existingTask) {
          existingTask.status = 'Pending'; // Update the status to 'Pending'
          await existingTask.save(); // Save the changes
    
          return res.status(200).json({ message: 'Task status updated to Pending', task: existingTask });
        } 
    
        // If task doesn't exist, return an error
        return res.status(404).json({ message: 'Task not found' });
    
      } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task', error });
      }
    };

    exports.updateGitrepo = async (req, res) => {
      try {
        const { id } = req.body;
        console.log(id, "id from git");
    
        // Find the task by its ID
        const existingTask = await DailyTask.findOne({ id });
    
        // If the task exists, update its status to 'Pending'
        if (existingTask) {
          existingTask.status = 'Success'; // Update the status to 'Pending'
          await existingTask.save(); // Save the changes
    
          return res.status(200).json({ message: 'Task status updated to Success', task: existingTask });
        } 
    
        // If task doesn't exist, return an error
        return res.status(404).json({ message: 'Task not found' });
    
      } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task', error });
      }
    };
    
     exports.getUsers = async (req, res) => {
        try {
          const users = await User.find().select('-password');
          res.json(users);
        } catch (error) {
          res.status(500).json({ error: 'Server Error' });
        }
      };


    // Send Message
exports.sendMessage = async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  if (!senderId || !receiverId || !content) {
      return res.status(400).json({ message: 'Sender ID, Receiver ID, and Content are required.' });
  }

  try {
      const message = await Message.create({ senderId, receiverId, content });
      res.status(201).json(message);
  } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Server Error' });
  }
};

// Get Messages
exports.getMessages = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
  }

  try {
      const messages = await Message.find({
          $or: [
              { senderId: userId },
              { receiverId: userId },
          ],
      }).populate('senderId receiverId', '-password');

      return res.status(200).json(messages);
  } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ message: 'Server Error' });
  }
};


// note this admin side backend api for getting users details 

// Get all users
exports.getAllUsers = async (req, res, next) => {
    try {
      const users = await User.find().select('-__v -updatedAt -apikey -salt'); // Exclude unnecessary fields
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  };
  
  // Create new user
  exports.createUser = async (req, res, next) => {
    const { username, email, phoneNumber, selectedDistrict, batch, role } = req.body;
    try {
      const newUser = new User({ username, email, phoneNumber, selectedDistrict, batch, role });
      await newUser.save();
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  };
  
  // Delete user by username
// Delete user by ID  so indha admin based code la special authentication vaikanum ok va, like JWT vachu admin mattu the api endpoint ah oru specif encryped token ah vachu access pandra mari irukanum
exports.deleteUser = async (req, res, next) => {
    const { id } = req.params; // Change from username to id
    console.log(id,"id")
    try {z
      const deletedUser = await User.findByIdAndDelete(id); // Use findByIdAndDelete
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
  
