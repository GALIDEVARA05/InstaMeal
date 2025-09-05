const mongoose = require('mongoose'); 
const Schema = mongoose.Schema;

const MealSchema = new Schema({
  name: { type: String, required: true },             // Meal name (e.g., Idly, Chicken Curry)
  price: { type: Number, required: true },            // Price per item
  category: {                                         // Type of meal
    type: String,
    enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    required: true
  },
  isVeg: { type: Boolean, default: true },            // Veg/Non-veg flag
  description: { type: String },                      // Short description
  imageUrl: { type: String },                         // Optional image for frontend UI
  available: { type: Boolean, default: true },
  quantity: { type: Number, default: 0, min: 0 } , 
  priceOptions: [{ type: Number }],       // Available for order
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meal', MealSchema);
