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

-- ---------------------------------------------------------------------------
-- Inventory module
-- Stock is kept in base units (gram / ml): 30 kg of maida is stored as 30000 gram.

DO $$ BEGIN
  CREATE TYPE stock_unit AS ENUM ('gram', 'ml');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Raw products master (maida, potato, cheese...)
CREATE TABLE IF NOT EXISTS raw_products (
  id            SERIAL PRIMARY KEY,
  product_name  VARCHAR(255) NOT NULL UNIQUE,
  product_image VARCHAR(255) NULL,
  created_at    TIMESTAMPTZ  DEFAULT now()
);
-- The unit a raw product is measured in; purchase, recipe and stock lines must use it.
ALTER TABLE raw_products ADD COLUMN IF NOT EXISTS product_unit stock_unit NOT NULL DEFAULT 'gram';

-- Current stock: one row per raw product. Purchases add to it, bills (via recipes) take from it.
-- Stock never goes below zero: bills / purchase edits that would need more are rejected.
CREATE TABLE IF NOT EXISTS inventory (
  id             SERIAL PRIMARY KEY,
  raw_product_id INT NOT NULL UNIQUE
    CONSTRAINT fk_inventory_raw REFERENCES raw_products(id) ON DELETE CASCADE,
  product_qty    INT        NOT NULL DEFAULT 0,
  product_unit   stock_unit NOT NULL DEFAULT 'gram',
  created_at     TIMESTAMPTZ DEFAULT now()
);
-- true once the "running out" email went out; cleared when stock is topped up again.
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_alerted BOOLEAN NOT NULL DEFAULT false;
-- Units created before raw products had one: take them from the stock row.
UPDATE raw_products rp SET product_unit = i.product_unit
  FROM inventory i WHERE i.raw_product_id = rp.id AND rp.product_unit <> i.product_unit;
UPDATE inventory SET product_qty = 0 WHERE product_qty < 0;
DO $$ BEGIN
  ALTER TABLE inventory ADD CONSTRAINT chk_inventory_qty_non_negative CHECK (product_qty >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recipe: one per sellable product.
CREATE TABLE IF NOT EXISTS recipe (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL UNIQUE
    CONSTRAINT fk_recipe_product REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Raw products used to make ONE unit of the recipe's product (e.g. 40 gram maida).
CREATE TABLE IF NOT EXISTS recipe_items (
  id             SERIAL PRIMARY KEY,
  recipe_id      INT NOT NULL
    CONSTRAINT fk_recipe_items_recipe REFERENCES recipe(id) ON DELETE CASCADE,
  raw_product_id INT NOT NULL
    CONSTRAINT fk_recipe_items_raw REFERENCES raw_products(id) ON DELETE RESTRICT,
  qty            INT        NOT NULL CHECK (qty > 0),
  unit           stock_unit NOT NULL DEFAULT 'gram',
  CONSTRAINT uq_recipe_items UNIQUE (recipe_id, raw_product_id)
);

-- Purchases (supplier invoices)
CREATE TABLE IF NOT EXISTS purchase (
  id           SERIAL PRIMARY KEY,
  invoice_no   VARCHAR(255) NULL,
  invoice_date DATE         NULL,
  total        INT          NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_date ON purchase (invoice_date);

CREATE TABLE IF NOT EXISTS purchase_items (
  id             SERIAL PRIMARY KEY,
  purchase_id    INT NOT NULL
    CONSTRAINT fk_pi_purchase REFERENCES purchase(id) ON DELETE CASCADE,
  raw_product_id INT NOT NULL
    CONSTRAINT fk_pi_raw REFERENCES raw_products(id) ON DELETE RESTRICT,
  product_qty    INT        NOT NULL CHECK (product_qty > 0),
  product_unit   stock_unit NOT NULL DEFAULT 'gram',
  subtotal       INT        NOT NULL DEFAULT 0,
  expiry_date    DATE       NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pi_purchase ON purchase_items (purchase_id);

-- Exactly what each bill took out of stock, so cancelling it puts the same amounts back
-- (even if the recipe changed in between). Deleted with the order.
CREATE TABLE IF NOT EXISTS order_inventory (
  id             SERIAL PRIMARY KEY,
  order_id       INT NOT NULL
    CONSTRAINT fk_oi_order REFERENCES orders(id) ON DELETE CASCADE,
  raw_product_id INT NOT NULL
    CONSTRAINT fk_oi_raw REFERENCES raw_products(id) ON DELETE CASCADE,
  qty            INT        NOT NULL CHECK (qty > 0),
  unit           stock_unit NOT NULL
);

-- Stock held for a cart whose KOT went to the kitchen, until the order is placed (checkout
-- uses it), the cart is cleared (released back to stock) or it expires (released).
-- The stock is already taken out of `inventory`, so other counters see it as gone.
-- reservation_key = the POS cart id (carts are shared by every counter).
CREATE TABLE IF NOT EXISTS stock_reservations (
  reservation_key VARCHAR(64) PRIMARY KEY,
  products        JSONB       NOT NULL DEFAULT '[]', -- [{ id, qty }] the KOT was printed for
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_reservation_lines (
  id              SERIAL PRIMARY KEY,
  reservation_key VARCHAR(64) NOT NULL
    CONSTRAINT fk_srl_reservation REFERENCES stock_reservations(reservation_key) ON DELETE CASCADE,
  raw_product_id  INT NOT NULL
    CONSTRAINT fk_srl_raw REFERENCES raw_products(id) ON DELETE CASCADE,
  qty             INT        NOT NULL CHECK (qty > 0),
  unit            stock_unit NOT NULL,
  CONSTRAINT uq_srl UNIQUE (reservation_key, raw_product_id)
);
-- Which cart's reservation an order used, so cancelling it hands the stock back to that cart.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_key VARCHAR(64) NULL;

-- Indexes for the inventory module's joins, lookups and list ordering.
-- (Primary keys and UNIQUE columns — raw_products.product_name, inventory.raw_product_id,
--  recipe.product_id, raw_items (recipe_id, raw_product_id) — are indexed already.)
CREATE INDEX IF NOT EXISTS idx_raw_items_raw      ON raw_items (raw_product_id);       -- delete/usage checks on a raw product
CREATE INDEX IF NOT EXISTS idx_pi_raw             ON purchase_items (raw_product_id);  -- delete/usage checks on a raw product
CREATE INDEX IF NOT EXISTS idx_pi_expiry          ON purchase_items (expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_list      ON purchase (invoice_date DESC NULLS LAST, id DESC); -- purchase list order
CREATE INDEX IF NOT EXISTS idx_purchase_invoice   ON purchase (invoice_no);
CREATE INDEX IF NOT EXISTS idx_order_inventory    ON order_inventory (order_id);       -- restore on cancel
CREATE INDEX IF NOT EXISTS idx_order_inventory_raw ON order_inventory (raw_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low      ON inventory (product_qty) WHERE NOT low_stock_alerted; -- low-stock scan
CREATE INDEX IF NOT EXISTS idx_items_product      ON order_items (product_id);         -- sales per product
CREATE INDEX IF NOT EXISTS idx_reservations_expiry ON stock_reservations (expires_at);  -- expiry sweep
CREATE INDEX IF NOT EXISTS idx_srl_raw            ON stock_reservation_lines (raw_product_id); -- reserved per raw product

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
ALTER TABLE raw_products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase               ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_inventory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservation_lines ENABLE ROW LEVEL SECURITY;

-- Seed categories (admin user + products come from `npm run seed`).
INSERT INTO categories (name) VALUES
  ('Whole Spices'), ('Ground Spices'), ('Masala Blends'), ('Dry Fruits')
ON CONFLICT (name) DO NOTHING;
