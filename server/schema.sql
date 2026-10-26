-- POS schema (MySQL / MariaDB). The database itself is created by migrate.js
-- (on shared hosting, create it from the control panel first).

-- Staff / admin users
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,          -- bcrypt hash
  name       VARCHAR(100),
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NULL,
  name        VARCHAR(150)  NOT NULL,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,  -- per unit
  image       VARCHAR(255),
  is_active   TINYINT       NOT NULL DEFAULT 1,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_category (category_id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sub-items: add-on choices for a product (bread, protein, sauce, extra toppings).
-- Kept out of `products` so they don't show up as standalone menu items.
CREATE TABLE IF NOT EXISTS subitems (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  group_name  VARCHAR(50)   NOT NULL,           -- e.g. 'Choice of Bread'
  name        VARCHAR(150)  NOT NULL,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0, -- extra charge, 0 = free
  is_active   TINYINT       NOT NULL DEFAULT 1,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subitems_group (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which sub-item groups a product offers (e.g. Sandwich -> bread, protein, sauce, toppings).
CREATE TABLE IF NOT EXISTS product_subitem_groups (
  product_id  INT         NOT NULL,
  group_name  VARCHAR(50) NOT NULL,
  PRIMARY KEY (product_id, group_name),
  CONSTRAINT fk_psg_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders (one receipt = one order)
CREATE TABLE IF NOT EXISTS orders (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  total      DECIMAL(10,2) NOT NULL DEFAULT 0,
  item_count INT           NOT NULL DEFAULT 0,  -- number of products (lines)
  created_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT,
  name       VARCHAR(150)  NOT NULL,          -- snapshot at sale time
  price      DECIMAL(10,2) NOT NULL,          -- unit price snapshot
  qty        INT NOT NULL DEFAULT 1,          -- quantity sold
  amount     DECIMAL(10,2) NOT NULL,          -- (price + sub-item prices) * qty
  INDEX idx_items_order (order_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sub-items chosen for an order line (snapshot at sale time)
CREATE TABLE IF NOT EXISTS order_item_subitems (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  subitem_id    INT,
  group_name    VARCHAR(50)   NOT NULL,
  name          VARCHAR(150)  NOT NULL,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  INDEX idx_ois_item (order_item_id),
  CONSTRAINT fk_ois_item FOREIGN KEY (order_item_id)
    REFERENCES order_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cart
CREATE TABLE IF NOT EXISTS cart (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cart_id    VARCHAR(150) NOT NULL,
  cart_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  item_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  cart_id    INT NOT NULL,
  product_id INT NOT NULL,
  price      DECIMAL(10,2) NOT NULL,          -- unit price
  qty        INT NOT NULL DEFAULT 1,
  subitems   TEXT NULL,                       -- JSON [{id, group_name, name, price}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cart_items (cart_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT NOT NULL,
  customer_name   VARCHAR(150) NULL,
  customer_mobile BIGINT NULL,
  customer_email  VARCHAR(150),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_order (order_id),
  CONSTRAINT customer_mobile_valid
    CHECK (customer_mobile IS NULL OR
           customer_mobile BETWEEN 1000000000 AND 9999999999)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE IF NOT EXISTS payment (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  cash       DECIMAL(10,2) NOT NULL DEFAULT 0,
  online     DECIMAL(10,2) NOT NULL DEFAULT 0,
  status     VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_order (order_id),
  CONSTRAINT fk_payment_order FOREIGN KEY (order_id)
    REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed categories (admin user + products come from `npm run seed`).
INSERT IGNORE INTO categories (name) VALUES
  ('Whole Spices'), ('Ground Spices'), ('Masala Blends'), ('Dry Fruits');
