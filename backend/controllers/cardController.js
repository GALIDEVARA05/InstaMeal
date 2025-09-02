const MealCard = require('../models/MealCard');
const Meal = require('../models/Meal');
const Transaction = require('../models/Transaction');
const RechargeRequest = require('../models/RechargeRequest');
const User = require('../models/User');
const generateCardNumber = require('../utils/generateCardNumber');
const mongoose = require('mongoose');

// ===============================
// Admin/Manager: Create a Meal Card for Student (by rollNo)
// ===============================
exports.createCardForStudent = async (req, res) => {
  const { rollNo } = req.body;
  if (!rollNo) return res.status(400).json({ message: "Student roll number required" });

  const student = await User.findOne({ rollNo, role: "student" });
  if (!student) return res.status(404).json({ message: "Student not found" });

  const existing = await MealCard.findOne({ studentRollNo: rollNo });
  if (existing) return res.status(400).json({ message: "Card already exists for this student" });

  const cardNumber = generateCardNumber();
  const card = new MealCard({ 
    cardNumber, 
    student: student._id, 
    studentRollNo: rollNo 
  });
  await card.save();
  res.json(card);
};

// ===============================
// Get Card(s) by Student Roll Number
// ===============================
exports.getCardByStudent = async (req, res) => {
  const { rollNo } = req.params;
  const cards = await MealCard.find({ studentRollNo: rollNo }).populate('selectedItems.meal');
  res.json(cards);
};

// ===============================
// Student: Add Item(s) to MealCard
// ===============================
exports.addItemToCard = async (req, res) => {
  const { cardId, mealId, quantity } = req.body;
  if (!cardId || !mealId) return res.status(400).json({ message: 'Missing fields' });

  const card = await MealCard.findById(cardId);
  if (!card) return res.status(404).json({ message: 'Card not found' });

  // ensure only student who owns rollNo can modify
  if (card.studentRollNo !== req.user.rollNo) {
    return res.status(403).json({ message: 'Not your card' });
  }

  const meal = await Meal.findById(mealId);
  if (!meal || !meal.available) return res.status(404).json({ message: 'Meal not available' });

  const existing = card.selectedItems.find(item => String(item.meal) === mealId);
  if (existing) {
    existing.quantity += quantity || 1;
  } else {
    card.selectedItems.push({ meal: mealId, quantity: quantity || 1 });
  }

  await card.save();
  res.json({ message: 'Item added', selectedItems: card.selectedItems });
};

// ===============================
// Student: Remove Item from MealCard
// ===============================
exports.removeItemFromCard = async (req, res) => {
  const { cardId, mealId } = req.body;
  const card = await MealCard.findById(cardId);
  if (!card) return res.status(404).json({ message: 'Card not found' });

  if (card.studentRollNo !== req.user.rollNo) {
    return res.status(403).json({ message: 'Not your card' });
  }

  card.selectedItems = card.selectedItems.filter(item => String(item.meal) !== mealId);
  await card.save();
  res.json({ message: 'Item removed', selectedItems: card.selectedItems });
};

// ===============================
// Cashier: View Selected Items Before Purchase
// ===============================
exports.getSelectedItems = async (req, res) => {
  const { cardId } = req.params;
  const card = await MealCard.findById(cardId).populate('selectedItems.meal');
  if (!card) return res.status(404).json({ message: 'Card not found' });

  const total = card.selectedItems.reduce((sum, item) => {
    return sum + item.meal.price * item.quantity;
  }, 0);

  res.json({
    cardId: card._id,
    cardNumber: card.cardNumber,
    balance: card.balance,
    selectedItems: card.selectedItems,
    totalCost: total
  });
};

// ===============================
// Cashier: Finalize Purchase
// ===============================
exports.finalizePurchase = async (req, res) => {
  const { cardId } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const card = await MealCard.findById(cardId)
      .populate('selectedItems.meal')
      .session(session);

    if (!card) throw new Error('Card not found');
    if (card.status !== 'active') throw new Error('Card not active');

    // ✅ Check if student selected any items
    if (!card.selectedItems || card.selectedItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Please select items before finalizing purchase' });
    }

    const total = card.selectedItems.reduce(
      (sum, item) => sum + item.meal.price * item.quantity,
      0
    );

    // ✅ Prevent purchase if total = 0 (e.g., items without price)
    if (total <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid purchase: total amount is 0' });
    }

    if (card.balance < total) {
      await Transaction.create([{
        card: card._id,
        type: 'purchase',
        amount: total,
        status: 'failed',
        beforeBalance: card.balance,
        afterBalance: card.balance,
        performedBy: req.user._id,
        note: 'Insufficient funds for items'
      }], { session });

      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const before = card.balance;
    card.balance -= total;
    card.selectedItems = []; // ✅ clear cart after purchase
    await card.save({ session });

    const tx = await Transaction.create([{
      card: card._id,
      type: 'purchase',
      amount: total,
      status: 'success',
      beforeBalance: before,
      afterBalance: card.balance,
      performedBy: req.user._id,
      note: 'Meal items purchase'
    }], { session });

    await session.commitTransaction();
    session.endSession();
    res.json({ message: 'Purchase successful', transaction: tx[0] });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// Cashier: Fallback Purchase (manual)
// ===============================
exports.purchase = async (req, res) => {
  const { cardId, amount, note } = req.body;
  if (!cardId || !amount) return res.status(400).json({ message: 'Missing fields' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const card = await MealCard.findById(cardId).session(session);
    if (!card) throw new Error('Card not found');
    if (card.status !== 'active') throw new Error('Card not active');
    if (card.balance < amount) {
      await Transaction.create([{
        card: card._id, type: 'purchase', amount, status: 'failed',
        beforeBalance: card.balance, afterBalance: card.balance,
        performedBy: req.user._id, note: 'Insufficient funds'
      }], { session });
      await session.commitTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    const before = card.balance;
    card.balance -= amount;
    await card.save({ session });
    const tx = await Transaction.create([{
      card: card._id, type: 'purchase', amount, status: 'success',
      beforeBalance: before, afterBalance: card.balance,
      performedBy: req.user._id, note: note || ''
    }], { session });
    await session.commitTransaction();
    session.endSession();
    res.json({ message: 'Purchase successful', transaction: tx[0] });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// Student: Request Recharge
// ===============================
exports.requestRecharge = async (req, res) => {
  const { cardId, amount } = req.body;
  const card = await MealCard.findById(cardId);
  if (!card) return res.status(404).json({ message: 'Card not found' });

  const reqDoc = new RechargeRequest({
    student: req.user._id,
    card: card._id,
    amount
  });

  const auto = (process.env.AUTO_APPROVE_RECHARGES === 'true');
  if (auto) {
    reqDoc.status = 'approved';
    reqDoc.processedAt = new Date();
    reqDoc.processedBy = req.user._id;
    await reqDoc.save();
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const before = card.balance;
      card.balance += amount;
      await card.save({ session });
      await reqDoc.save({ session });
      const tx = await Transaction.create([{
        card: card._id, type: 'recharge', amount, status: 'success',
        beforeBalance: before, afterBalance: card.balance,
        performedBy: req.user._id, note: 'Auto-approved recharge'
      }], { session });
      await session.commitTransaction();
      session.endSession();
      return res.json({ message: 'Recharge auto-approved and credited', transaction: tx[0] });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ message: e.message });
    }
  } else {
    await reqDoc.save();
    return res.json({ message: 'Recharge requested and pending approval', request: reqDoc });
  }
};
