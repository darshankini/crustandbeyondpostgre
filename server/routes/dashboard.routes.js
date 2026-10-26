const router = require('express').Router();

const pool = require('../db');
const { requireAuth } = require('../auth');



router.use(requireAuth);

// GET /api/dashboard
// Today's order count, sales, and 7-day trend.
router.get('/', async (_req, res) => {
  // Today's summary
  const todayResult = await pool.query(
    `SELECT
       COUNT(*) AS orders,
       COALESCE(SUM(COALESCE(final_total, total)), 0) AS sales
     FROM orders
     WHERE (created_at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date`,
    [pool.TZ]
  );

  // 7-day trend
  const trendResult = await pool.query(
    `SELECT
       (created_at AT TIME ZONE $1)::date AS day,
       COUNT(*) AS orders,
       COALESCE(SUM(COALESCE(final_total, total)), 0) AS sales
     FROM orders
     WHERE (created_at AT TIME ZONE $1)::date >= (now() AT TIME ZONE $1)::date - 6
     GROUP BY 1
     ORDER BY day`,
    [pool.TZ]
  );

  const today = todayResult[0][0];

  res.json({
    today: {
      orders: today.orders,
      sales: today.sales
    },
    trend: trendResult[0]
  });
});

module.exports = router;