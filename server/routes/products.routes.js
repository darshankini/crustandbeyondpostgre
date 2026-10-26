const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const pool = require('../db');
const { requireAuth } = require('../auth');

// --- Image uploads ---------------------------------------------------------
// Files are stored on disk under server/uploads and served statically from
// /uploads (see index.js). The product row keeps an absolute URL to the file.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    cb(null, `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) =>
    /^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed')),
});

// Public list with optional ?category=<id> and ?search=<text> filters (used by the POS screen).
router.get('/', async (req, res) => {
  const { category } = req.query;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

  const params = [];

  let sql = `
    SELECT
      p.id,
      p.name,
      p.price,
      p.image,
      p.category_id,
      c.name AS category,
      (SELECT GROUP_CONCAT(g.group_name ORDER BY g.group_name SEPARATOR '|')
         FROM product_subitem_groups g WHERE g.product_id = p.id) AS subitem_groups
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1
  `;

  if (category) {
    sql += ' AND p.category_id = ?';
    params.push(category);
  }

  if (search) {
    // Match anywhere in the name; escape LIKE wildcards so "%" or "_" are searched literally.
    sql += " AND p.name LIKE ? ESCAPE '\\\\'";
    params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
  }

  sql += ' ORDER BY p.name';

  const result = await pool.query(sql, params);

  res.json(result[0].map((p) => ({
    ...p,
    subitem_groups: p.subitem_groups ? p.subitem_groups.split('|') : [],
  })));
});

// Replace the sub-item groups a product offers.
async function setSubitemGroups(productId, groups) {
  const list = [...new Set((Array.isArray(groups) ? groups : []).filter(Boolean).map(String))];
  await pool.query('DELETE FROM product_subitem_groups WHERE product_id = ?', [productId]);
  if (list.length) {
    await pool.query(
      'INSERT INTO product_subitem_groups (product_id, group_name) VALUES ?',
      [list.map((g) => [productId, g])]
    );
  }
  return list;
}

// CRUD below requires auth.
router.use(requireAuth);

// POST /api/products/upload  (multipart, field name: "image")
// Saves the uploaded image and returns its absolute URL to store on the product.
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no image file' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.filename });
});

router.post('/', async (req, res) => {
  const { name, price, category_id, image, subitem_groups } = req.body || {};

  if (!name || price == null) {
    return res.status(400).json({
      error: 'name and price required'
    });
  }

  const result = await pool.query(
    `INSERT INTO products
      (name, price, category_id, image)
     VALUES (?, ?, ?, ?)`,
    [
      name,
      price,
      category_id || null,
      image || null
    ]
  );

  const groups = await setSubitemGroups(result[0].insertId, subitem_groups);

  res.status(201).json({
    id: result[0].insertId,
    name,
    price,
    category_id: category_id || null,
    image: image || null,
    subitem_groups: groups
  });
});

router.put('/:id', async (req, res) => {
  const { name, price, category_id, image, subitem_groups } = req.body || {};

  await pool.query(
    `UPDATE products
     SET name = ?,
         price = ?,
         category_id = ?,
         image = ?
     WHERE id = ?`,
    [
      name,
      price,
      category_id || null,
      image || null,
      req.params.id
    ]
  );

  const groups = await setSubitemGroups(req.params.id, subitem_groups);

  res.json({
    id: Number(req.params.id),
    name,
    price,
    category_id: category_id || null,
    image: image || null,
    subitem_groups: groups
  });
});

router.delete('/:id', async (req, res) => {
  await pool.query(
    'DELETE FROM products WHERE id = ?',
    [req.params.id]
  );

  res.json({ ok: true });
});

module.exports = router;