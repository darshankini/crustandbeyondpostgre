-- POS schema (PostgreSQL / Supabase). Run with `npm run migrate`.

-- Staff / admin users
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,          -- bcrypt hash
  name       VARCHAR(100),
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  category_id INT NULL
    CONSTRAINT fk_products_category REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(150)  NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,  -- per unit
  image       VARCHAR(255),
  is_active   SMALLINT      NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);

-- Sub-items: add-on choices for a product (bread, protein, sauce, extra toppings).
-- Kept out of `products` so they don't show up as standalone menu items.
CREATE TABLE IF NOT EXISTS subitems (
  id          SERIAL PRIMARY KEY,
  group_name  VARCHAR(50)   NOT NULL,           -- e.g. 'Choice of Bread'
  name        VARCHAR(150)  NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0, -- extra charge, 0 = free
  is_active   SMALLINT      NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subitems_group ON subitems (group_name);

-- Which sub-item groups a product offers (e.g. Sandwich -> bread, protein, sauce, toppings).
CREATE TABLE IF NOT EXISTS product_subitem_groups (
  product_id  INT         NOT NULL
    CONSTRAINT fk_psg_product REFERENCES products(id) ON DELETE CASCADE,
  group_name  VARCHAR(50) NOT NULL,
  PRIMARY KEY (product_id, group_name)
);

-- Orders (one receipt = one order)
CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_count INT           NOT NULL DEFAULT 0,  -- number of products (lines)
  created_at TIMESTAMPTZ   DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
-- Discount: `total` is the pre-discount amount; `final_total` is what the customer pays.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type   VARCHAR(10)   NULL;              -- 'flat' | 'percent' | NULL
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount        NUMERIC(10,2) NOT NULL DEFAULT 0; -- value entered (Rs. or %)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0; -- Rs. taken off
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_total     NUMERIC(10,2) NULL;
UPDATE orders SET final_total = total WHERE final_total IS NULL;  -- orders placed before discounts existed

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL
    CONSTRAINT fk_items_order REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT,
  name       VARCHAR(150)  NOT NULL,          -- snapshot at sale time
  price      NUMERIC(10,2) NOT NULL,          -- unit price snapshot
  qty        INT NOT NULL DEFAULT 1,          -- quantity sold
  amount     NUMERIC(10,2) NOT NULL           -- (price + sub-item prices) * qty
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items (order_id);

-- Sub-items chosen for an order line (snapshot at sale time)
CREATE TABLE IF NOT EXISTS order_item_subitems (
  id            SERIAL PRIMARY KEY,
  order_item_id INT NOT NULL
    CONSTRAINT fk_ois_item REFERENCES order_items(id) ON DELETE CASCADE,
  subitem_id    INT,
  group_name    VARCHAR(50)   NOT NULL,
  name          VARCHAR(150)  NOT NULL,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ois_item ON order_item_subitems (order_item_id);

-- Cart
CREATE TABLE IF NOT EXISTS cart (
  id         SERIAL PRIMARY KEY,
  cart_id    VARCHAR(150) NOT NULL,
  cart_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  item_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cart ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10)   NULL;
ALTER TABLE cart ADD COLUMN IF NOT EXISTS discount      NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  cart_id    INT NOT NULL,
  product_id INT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,          -- unit price
  qty        INT NOT NULL DEFAULT 1,
  subitems   TEXT NULL,                       -- JSON [{id, group_name, name, price}]
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items ON cart_items (cart_id);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL PRIMARY KEY,
  order_id        INT NOT NULL,
  customer_name   VARCHAR(150) NULL,
  customer_mobile BIGINT NULL,
  customer_email  VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT customer_mobile_valid
    CHECK (customer_mobile IS NULL OR
           customer_mobile BETWEEN 1000000000 AND 9999999999)
);
CREATE INDEX IF NOT EXISTS idx_customers_order ON customers (order_id);

-- Payments
CREATE TABLE IF NOT EXISTS payment (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL
    CONSTRAINT fk_payment_order REFERENCES orders(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL,
  cash       NUMERIC(10,2) NOT NULL DEFAULT 0,
  online     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status     VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_order ON payment (order_id);

-- Where an order came from: 'pos' (counter) or an aggregator ('zomato', 'swiggy').
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'pos';

-- Online orders pushed by Zomato / Swiggy. A POS order (orders row) is created when the
-- order is accepted, so accepted aggregator sales show up in the dashboard and order list.
CREATE TABLE IF NOT EXISTS aggregator_orders (
  id                SERIAL PRIMARY KEY,
  platform          VARCHAR(20)   NOT NULL,                 -- 'zomato' | 'swiggy'
  external_order_id VARCHAR(100)  NOT NULL,                 -- the platform's order id
  outlet_id         VARCHAR(100),
  status            VARCHAR(20)   NOT NULL DEFAULT 'placed',
    -- placed -> accepted -> ready -> picked_up -> delivered; or rejected / cancelled
  order_type        VARCHAR(20),                            -- 'delivery' | 'pickup'
  customer_name     VARCHAR(150),
  customer_phone    VARCHAR(30),                            -- platforms usually send a masked number
  delivery_address  TEXT,
  instructions      TEXT,
  subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,       -- items
  packaging_charge  NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_charge   NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxes             NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount          NUMERIC(10,2) NOT NULL DEFAULT 0,       -- merchant-funded discount
  total             NUMERIC(10,2) NOT NULL DEFAULT 0,       -- what the customer paid
  payment_mode      VARCHAR(20),                            -- 'prepaid' | 'cod'
  prep_time         INT,                                    -- minutes promised on accept
  reject_reason     TEXT,
  rider_name        VARCHAR(150),
  rider_phone       VARCHAR(30),
  order_id          INT NULL
    CONSTRAINT fk_agg_order REFERENCES orders(id) ON DELETE SET NULL,
  raw_payload       JSONB,                                  -- last payload received, for debugging
  placed_at         TIMESTAMPTZ   DEFAULT now(),
  accepted_at       TIMESTAMPTZ,
  ready_at          TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ   DEFAULT now(),
  CONSTRAINT uq_agg_platform_order UNIQUE (platform, external_order_id)
);
CREATE INDEX IF NOT EXISTS idx_agg_orders_status ON aggregator_orders (platform, status);
CREATE INDEX IF NOT EXISTS idx_agg_orders_placed ON aggregator_orders (placed_at);

CREATE TABLE IF NOT EXISTS aggregator_order_items (
  id                  SERIAL PRIMARY KEY,
  aggregator_order_id INT NOT NULL
    CONSTRAINT fk_agg_items_order REFERENCES aggregator_orders(id) ON DELETE CASCADE,
  external_item_id    VARCHAR(100),
  product_id          INT NULL,                              -- matched POS product, if any
  name                VARCHAR(150)  NOT NULL,
  price               NUMERIC(10,2) NOT NULL DEFAULT 0,      -- unit price incl. add-ons
  qty                 INT           NOT NULL DEFAULT 1,
  amount              NUMERIC(10,2) NOT NULL DEFAULT 0,
  addons              JSONB         NOT NULL DEFAULT '[]',   -- [{ name, price }]
  instructions        TEXT
);
CREATE INDEX IF NOT EXISTS idx_agg_items_order ON aggregator_order_items (aggregator_order_id);

-- Platform menu item id -> POS product. Rows missing here fall back to matching by name.
CREATE TABLE IF NOT EXISTS aggregator_menu_map (
  platform         VARCHAR(20)  NOT NULL,
  external_item_id VARCHAR(100) NOT NULL,
  product_id       INT NOT NULL
    CONSTRAINT fk_agg_map_product REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (platform, external_item_id)
);

-- Every status change, from the platform or from the POS.
CREATE TABLE IF NOT EXISTS aggregator_status_log (
  id                  SERIAL PRIMARY KEY,
  aggregator_order_id INT NOT NULL
    CONSTRAINT fk_agg_log_order REFERENCES aggregator_orders(id) ON DELETE CASCADE,
  status              VARCHAR(20) NOT NULL,
  source              VARCHAR(20) NOT NULL,                  -- 'platform' | 'pos'
  note                TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agg_log_order ON aggregator_status_log (aggregator_order_id);

-- The API connects directly (not via the Supabase REST API), so block anonymous
-- REST access to these tables by enabling RLS with no policies.
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subitems               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subitem_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_subitems    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment                ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_menu_map    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_status_log  ENABLE ROW LEVEL SECURITY;

-- Seed categories (admin user + products come from `npm run seed`).
INSERT INTO categories (name) VALUES
  ('Whole Spices'), ('Ground Spices'), ('Masala Blends'), ('Dry Fruits')
ON CONFLICT (name) DO NOTHING;
