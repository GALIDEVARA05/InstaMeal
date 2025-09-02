const express = require('express');
const router = express.Router();
const tx = require('../controllers/transactionController');
const auth = require('../middleware/auth');

router.get('/card/:cardId', auth, tx.getByCard);
router.get('/recent', auth, tx.getRecent);

module.exports = router;
