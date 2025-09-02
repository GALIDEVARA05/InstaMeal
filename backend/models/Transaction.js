const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  card: { type: Schema.Types.ObjectId, ref: 'MealCard', required: true },
  type: { type: String, enum: ['recharge','purchase','refund'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['success','failed','pending'], required: true },
  beforeBalance: { type: Number },
  afterBalance: { type: Number },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // cashier or student for recharge
  note: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
