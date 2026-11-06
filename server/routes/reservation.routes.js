// /api/reservations — KOT stock reservations. route -> validate -> controller -> service -> repository
const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { validate } = require('../validators/common');
const v = require('../validators/reservation.validator');
const c = require('../controllers/reservation.controller');

router.use(requireAuth);

router.get('/', c.list);                                   // active reservations (what each cart's KOT holds)
router.post('/', validate(v.reserve), c.reserve);          // KOT printed: (re)reserve the cart's stock, 409 if short
router.delete('/:key', validate(v.keyParam), c.release);   // cart cleared: release its stock

module.exports = router;
