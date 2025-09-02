const RechargeRequest = require('../models/RechargeRequest');
const MealCard = require('../models/MealCard');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

exports.listPending = async (req, res) => {
  const pending = await RechargeRequest.find({ status: 'pending' }).populate('student', 'name email').populate('card');
  res.json(pending);
};

exports.process = async (req, res) => {
  // manager approves or rejects
  const { requestId, action, note } = req.body; // action = 'approve'|'reject'
  const doc = await RechargeRequest.findById(requestId);
  if(!doc) return res.status(404).json({ message: 'Request not found' });
  if(doc.status !== 'pending') return res.status(400).json({ message: 'Already processed' });

  if(action === 'reject'){
    doc.status = 'rejected';
    doc.processedAt = new Date();
    doc.processedBy = req.user._id;
    doc.note = note || '';
    await doc.save();
    return res.json({ message: 'Rejected', doc });
  } else if(action === 'approve'){
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const card = await MealCard.findById(doc.card).session(session);
      const before = card.balance;
      card.balance += doc.amount;
      await card.save({ session });
      doc.status = 'approved';
      doc.processedAt = new Date();
      doc.processedBy = req.user._id;
      doc.note = note || '';
      await doc.save({ session });
      const tx = await Transaction.create([{
        card: card._id, type: 'recharge', amount: doc.amount, status: 'success',
        beforeBalance: before, afterBalance: card.balance, performedBy: req.user._id, note: 'manager approved'
      }], { session });
      await session.commitTransaction();
      session.endSession();
      res.json({ message: 'Approved and credited', transaction: tx[0] });
    } catch(err){
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    res.status(400).json({ message: 'Invalid action' });
  }
};
