const express = require('express');
const router = express.Router();
const cardCtrl = require('../controllers/cardController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// ===============================
// Admin/Manager: create card for student (by rollNo)
// ===============================
router.post(
  '/create',
  auth,
  roles(['admin', 'manager']),
  cardCtrl.createCardForStudent
);


// ===============================
// Get cards for a student (by rollNo instead of ObjectId)
// ===============================
router.get(
  '/student/:rollNo',
  auth,
  roles(['admin', 'manager', 'cashier', 'student']),
  cardCtrl.getCardByStudent
);

// ===============================
// Student: manage items
// ===============================
router.post('/add-item', auth, roles(['student']), cardCtrl.addItemToCard);
router.post('/remove-item', auth, roles(['student']), cardCtrl.removeItemFromCard);
router.post('/decrement-item', auth, roles(['student']), cardCtrl.decrementItemFromCard);

// ===============================
// Cashier: view & finalize purchases
// ===============================
router.get('/items/:cardId', auth, roles(['cashier']), cardCtrl.getSelectedItems);
router.post('/finalize-purchase', auth, roles(['cashier']), cardCtrl.finalizePurchase);

// ===============================
// Cashier: fallback direct purchase
// ===============================
router.post('/purchase', auth, roles(['cashier']), cardCtrl.purchase);

// ===============================
// Student: request recharge
// ===============================
router.post('/request-recharge', auth, roles(['student']), cardCtrl.requestRecharge);

module.exports = router;
