const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SelectedItemSchema = new Schema({
  meal: { type: Schema.Types.ObjectId, ref: 'Meal', required: true },
  quantity: { type: Number, default: 1, min: 1 }
}, { _id: false });

const MealCardSchema = new Schema({
  cardNumber: { type: String, required: true, unique: true },
  
  // link by both rollNo & userId for flexibility
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  studentRollNo: { type: String, required: true },

  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['active','blocked','lost'], default: 'active' },
  selectedItems: [SelectedItemSchema],   // store student’s chosen meals
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MealCard', MealCardSchema);
