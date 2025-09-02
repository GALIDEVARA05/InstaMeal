const express = require('express');
const router = express.Router();
const mealCtrl = require('../controllers/mealController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// 🌐 Any logged-in user (student/cashier/manager/admin) can view meals
router.get('/', auth, mealCtrl.listMeals);
router.post('/create', auth, roles(['admin','manager']), mealCtrl.createMeal);

// 🔐 Only admin/manager can manage meals
router.post('/', auth, roles(['admin', 'manager']), mealCtrl.createMeal);
router.put('/:id', auth, roles(['admin', 'manager']), mealCtrl.updateMeal);
router.delete('/:id', auth, roles(['admin', 'manager']), mealCtrl.deleteMeal);

module.exports = router;
