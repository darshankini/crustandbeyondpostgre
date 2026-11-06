// /api/raw-products — route -> validate -> controller -> service -> repository
// add / update are multipart/form-data so the image travels with the form.
const router = require('express').Router();
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const { validate } = require('../validators/common');
const v = require('../validators/rawProduct.validator');
const c = require('../controllers/rawProduct.controller');

// Kept in memory (max 150 KB) and only written to disk once the whole form is valid.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: v.MAX_IMAGE_BYTES, files: 1, fields: 10 },
});

// Turns multer errors (file too big, unexpected field) into 400s.
const imageUpload = (req, res, next) => upload.single('product_image')(req, res, (err) => {
  if (!err) return next();
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'image must be 150 KB or smaller' : err.message;
  res.status(400).json({ error: `product_image: ${message}`, errors: { product_image: message } });
});

router.use(requireAuth);

router.get('/', c.list);                                           // raw product list
router.get('/:id', validate(v.idParam), c.edit);                   // editRawProduct
router.post('/', imageUpload, validate(v.add), c.add);             // addRawProduct
router.post('/update', imageUpload, validate(v.update), c.update); // updateRawProduct { raw_product_id, ... }
router.delete('/:id', validate(v.idParam), c.remove);              // deleteRawProduct

module.exports = router;
