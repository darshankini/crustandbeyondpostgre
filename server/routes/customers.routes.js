const router = require('express').Router();
const pool = require('../db');
const { requireAuth } = require('../auth');

// Customer contact details are personal data — dashboard only.
router.use(requireAuth);

// GET /api/customers — one row per customer, with how many orders they placed.
// Records with no name, mobile or email are skipped. Customers are matched by mobile,
// then email, then name; the newest non-empty name/email is shown.
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `WITH c AS (
         SELECT id, order_id, customer_mobile,
                NULLIF(TRIM(customer_name), '')  AS customer_name,
                NULLIF(TRIM(customer_email), '') AS customer_email
         FROM customers
       )
       SELECT MAX(id) AS id,
              (ARRAY_AGG(customer_name  ORDER BY id DESC) FILTER (WHERE customer_name  IS NOT NULL))[1] AS customer_name,
              MAX(customer_mobile) AS customer_mobile,
              (ARRAY_AGG(customer_email ORDER BY id DESC) FILTER (WHERE customer_email IS NOT NULL))[1] AS customer_email,
              COUNT(DISTINCT order_id)::int AS order_count
       FROM c
       WHERE customer_name IS NOT NULL OR customer_mobile IS NOT NULL OR customer_email IS NOT NULL
       GROUP BY COALESCE(customer_mobile::text, LOWER(customer_email), LOWER(customer_name))
       ORDER BY MAX(id) DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('List customers failed:', error);
    res.status(500).json({ error: error.message || 'Failed to load customers' });
  }
});

module.exports = router;
