const User = require('../models/user');

const registerStudent = async (req, res) => {
    try {
        const { name, email, department, macAddress } = req.body;

        // Check if user with the same email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }   
        const newUser = new User({
            name,
            email,  
          department,
            macAddress});

        await newUser.save();
        res.status(201).json({ message: 'Student registered successfully', user: newUser });
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }   
};

module.exports = {
    registerStudent
};