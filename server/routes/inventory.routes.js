// /api/inventory — route -> validate -> controller -> service -> repository
const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { validate } = require('../validators/common');
const v = require('../validators/inventory.validator');
const c = require('../controllers/inventory.controller');

router.use(requireAuth);

router.get('/', c.list);                                   // inventory list
router.get('/:id', validate(v.idParam), c.edit);           // editInventory
router.post('/', validate(v.add), c.add);                  // addInventory
router.post('/update', validate(v.update), c.update);      // updateInventory { inventory_id, ... }
router.delete('/:id', validate(v.idParam), c.remove);      // deleteInventory

module.exports = router;
