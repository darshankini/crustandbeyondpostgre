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

  // Today / this week (Mon-today) / this month: orders, sales and how they were paid.
  // Cash and online come from the payment rows, capped at the bill so cash handed over
  // (e.g. a 500 note for a 450 bill) isn't counted as sales.
  const periodsResult = await pool.query(
    `WITH t AS (SELECT (now() AT TIME ZONE $1)::date AS today),
     per AS (
       SELECT 'today' AS key, today AS start FROM t
       UNION ALL SELECT 'week', date_trunc('week', today)::date FROM t
       UNION ALL SELECT 'month', date_trunc('month', today)::date FROM t
     ),
     paid AS (
       SELECT order_id,
              SUM(LEAST(cash, amount)) AS cash,
              SUM(LEAST(online, amount - LEAST(cash, amount))) AS online
       FROM payment
       GROUP BY order_id
     ),
     o AS (
       SELECT (o.created_at AT TIME ZONE $1)::date AS day,
              COALESCE(o.final_total, o.total) AS sale,
              COALESCE(p.cash, 0) AS cash,
              COALESCE(p.online, 0) AS online
       FROM orders o
       LEFT JOIN paid p ON p.order_id = o.id
       WHERE (o.created_at AT TIME ZONE $1)::date >= (SELECT MIN(start) FROM per)
     )
     SELECT per.key,
            COUNT(o.day) AS orders,
            COALESCE(SUM(o.sale), 0) AS sales,
            COALESCE(SUM(o.cash), 0) AS cash,
            COALESCE(SUM(o.online), 0) AS online
     FROM per
     LEFT JOIN o ON o.day >= per.start
     GROUP BY per.key`,
    [pool.TZ]
  );

  // Weekly sales for the last 12 weeks (Mon-Sun), including weeks with no orders.
  const monthlyResult = await pool.query(
  `WITH t AS (
      SELECT
        date_trunc('month', now() AT TIME ZONE $1)::date AS month_start,
        (now() AT TIME ZONE $1)::date AS today
   ),
   days AS (
      SELECT generate_series(
        month_start,
        today,
        interval '1 day'
      )::date AS day
      FROM t
   )
   SELECT
      d.day,
      COUNT(o.id) AS orders,
      COALESCE(
        SUM(COALESCE(o.final_total, o.total)),
        0
      ) AS sales
   FROM days d
   LEFT JOIN orders o
      ON (o.created_at AT TIME ZONE $1)::date = d.day
   GROUP BY d.day
   ORDER BY d.day`,
  [pool.TZ]
);

  const today = todayResult[0][0];
  const periods = Object.fromEntries(periodsResult[0].map(({ key, ...p }) => [key, p]));
  
  console.log(monthlyResult);

  res.json({
    today: {
      orders: today.orders,
      sales: today.sales
    },
    periods,
    trend: trendResult[0],
    monthly: monthlyResult[0]
  });
});

module.exports = router;