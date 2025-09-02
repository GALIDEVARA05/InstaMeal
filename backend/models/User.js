const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','manager','cashier','student'], required: true },

  // Only required for students
  rollNo: { type: String, unique: true, sparse: true },   // 👈 unique student ID
  course: { type: String },
  dob: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
