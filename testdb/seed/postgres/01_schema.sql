-- ============================================================
-- PostgreSQL seed — schema
-- DB Assistant test database
-- ============================================================

-- Categories
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Products
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku         VARCHAR(50) UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id           SERIAL PRIMARY KEY,
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    phone        VARCHAR(30),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status       order_status NOT NULL DEFAULT 'pending',
    total        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shipped_at   TIMESTAMPTZ
);

-- Order items
CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user       ON orders(user_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_users_email       ON users(email);

-- View: order summary (tests VIEW browsing in DB Assistant)
CREATE VIEW order_summary AS
SELECT
    o.id            AS order_id,
    o.status,
    o.created_at,
    o.total,
    u.first_name || ' ' || u.last_name AS customer_name,
    u.email,
    COUNT(oi.id)    AS item_count
FROM orders o
JOIN users u        ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.status, o.created_at, o.total, u.first_name, u.last_name, u.email;

-- Function: total spent by a user (tests stored routine browsing)
CREATE OR REPLACE FUNCTION user_total_spent(p_user_id INTEGER)
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(total), 0)
    FROM orders
    WHERE user_id = p_user_id
      AND status NOT IN ('cancelled');
$$ LANGUAGE SQL STABLE;
