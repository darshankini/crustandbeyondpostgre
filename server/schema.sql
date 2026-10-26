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

-- Seed categories (admin user + products come from `npm run seed`).
INSERT INTO categories (name) VALUES
  ('Whole Spices'), ('Ground Spices'), ('Masala Blends'), ('Dry Fruits')
ON CONFLICT (name) DO NOTHING;
