const Transaction = require('../models/Transaction');

exports.getByCard = async (req, res) => {
  const txs = await Transaction.find({ card: req.params.cardId }).sort({ createdAt: -1 }).limit(200);
  res.json(txs);
};

exports.getRecent = async (req, res) => {
  const txs = await Transaction.find().sort({ createdAt: -1 }).limit(50).populate('card').populate('performedBy','name');
  res.json(txs);
};
