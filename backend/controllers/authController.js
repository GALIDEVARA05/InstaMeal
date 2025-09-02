const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, rollNo, course, dob } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Check if email already exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });

    // If role is student, require rollNo
    if (role === "student") {
      if (!rollNo) {
        return res.status(400).json({ message: "Roll number required for student" });
      }
      const existingRoll = await User.findOne({ rollNo });
      if (existingRoll) {
        return res.status(400).json({ message: "Roll number already exists" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      passwordHash: hash,
      role,
      rollNo: role === "student" ? rollNo : null,
      course,
      dob,
    });

    await user.save();

    res.json({ 
      message: "Registered successfully", 
      id: user.rollNo || user._id, 
      role: user.role,
      name: user.name
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // JWT will always contain Mongo _id, role, and rollNo (if student)
    const token = jwt.sign(
      { _id: user._id, role: user.role, rollNo: user.rollNo || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
      id: user.rollNo || user._id // 👈 frontend uses rollNo for students
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
