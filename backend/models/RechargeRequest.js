const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RechargeRequestSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  card: { type: Schema.Types.ObjectId, ref: 'MealCard', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  note: String
});

module.exports = mongoose.model('RechargeRequest', RechargeRequestSchema);
