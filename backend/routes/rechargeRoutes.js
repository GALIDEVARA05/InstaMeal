const express = require('express');
const router = express.Router();
const rc = require('../controllers/rechargeController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

router.get('/pending', auth, roles(['manager','admin']), rc.listPending);
router.post('/process', auth, roles(['manager','admin']), rc.process);

module.exports = router;
