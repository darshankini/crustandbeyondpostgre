const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../auth');

// Public list with optional ?group=<group_name> filter (used by the POS screen).
router.get('/', async (req, res) => {
  const { group } = req.query;

  const params = [];

  let sql = `
    SELECT id, group_name, name, price
    FROM subitems
    WHERE is_active = 1
  `;

  if (group) {
    sql += ' AND group_name = ?';
    params.push(group);
  }

  sql += ' ORDER BY group_name, name';

  const result = await pool.query(sql, params);

  res.json(result[0]);
});

// CRUD below requires auth.
router.use(requireAuth);

router.post('/', async (req, res) => {
  const { group_name, name, price } = req.body || {};

  if (!group_name || !name) {
    return res.status(400).json({ error: 'group_name and name required' });
  }

  const result = await pool.query(
    'INSERT INTO subitems (group_name, name, price) VALUES (?, ?, ?)',
    [group_name, name, price || 0]
  );

  res.status(201).json({
    id: result[0].insertId,
    group_name,
    name,
    price: price || 0
  });
});

router.put('/:id', async (req, res) => {
  const { group_name, name, price } = req.body || {};

  if (!group_name || !name) {
    return res.status(400).json({ error: 'group_name and name required' });
  }

  await pool.query(
    'UPDATE subitems SET group_name = ?, name = ?, price = ? WHERE id = ?',
    [group_name, name, price || 0, req.params.id]
  );

  res.json({
    id: Number(req.params.id),
    group_name,
    name,
    price: price || 0
  });
});

router.delete('/:id', async (req, res) => {
  await pool.query(
    'DELETE FROM subitems WHERE id = ?',
    [req.params.id]
  );

  res.json({ ok: true });
});

module.exports = router;
