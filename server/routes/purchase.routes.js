// /api/purchases — route -> validate -> controller -> service -> repository
const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { validate } = require('../validators/common');
const v = require('../validators/purchase.validator');
const c = require('../controllers/purchase.controller');

router.use(requireAuth);

router.get('/', c.list);                                   // purchase list
router.get('/:id', validate(v.idParam), c.edit);           // editPurchase: one purchase + items
router.post('/', validate(v.add), c.add);                  // addPurchase
router.post('/update', validate(v.update), c.update);      // updatePurchase { purchase_id, ... }
router.delete('/:id', validate(v.idParam), c.remove);      // deletePurchase

module.exports = router;
