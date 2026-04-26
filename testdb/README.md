# testdb — Local Test Databases

> ⚠️ **Internal use only.** This folder is not intended to be part of the public open-source release.
> See [ROADMAP.md](../ROADMAP.md) for the pre-launch removal checklist item.

Spins up a **PostgreSQL 16** and **MySQL 8** instance via Docker Compose, pre-seeded with a realistic sample dataset for manually testing DB Assistant features.

---

## Quick Start

```bash
cd testdb

# Start both databases (detached)
docker compose up -d

# Check health — wait until both show "(healthy)"
docker compose ps

# Stop (data persisted in Docker volumes)
docker compose down

# Stop and wipe all data (full reset)
docker compose down -v
```

---

## Connection Details

| Field      | PostgreSQL          | MySQL               |
| ---------- | ------------------- | ------------------- |
| Host       | `localhost`         | `localhost`         |
| Port       | `5433`              | `3307`              |
| Database   | `sampledb`          | `sampledb`          |
| User       | `dbadmin`           | `dbadmin`           |
| Password   | `testpass`          | `testpass`          |

> These credentials are hardcoded for **local development only** and must never be used in any deployed environment.

---

## Seed Data Schema

Both databases are seeded with an identical logical schema representing a small e-commerce store. The schema is intentionally designed to exercise as many DB Assistant features as possible.

### Tables

| Table         | Rows | Purpose                                                |
| ------------- | ---- | ------------------------------------------------------ |
| `categories`  | 5    | Product categories — tests simple table browsing       |
| `products`    | 30   | Product catalogue — tests pagination, type variety     |
| `users`       | 15   | Customer accounts — includes inactive users for filter testing |
| `orders`      | 20   | Orders in all statuses — tests ENUM columns (PG) / ENUM type (MySQL) |
| `order_items` | 44   | Line items — tests FK relationships and JOIN queries   |
| `reviews`     | 20   | Multi-FK table (→ products + → users) — tests FK browser, ERD, SET NULL on user delete, CASCADE on product delete |

### Views

| View            | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| `order_summary` | Joins orders + users + items — tests view browsing    |

### Routines

| Name                          | Type      | Database   | Purpose                                  |
| ----------------------------- | --------- | ---------- | ---------------------------------------- |
| `user_total_spent(user_id)`   | Function  | PostgreSQL | Tests stored function browsing           |
| `get_user_orders(user_id)`    | Procedure | MySQL      | Tests stored procedure browsing          |

### Data Types Covered

- `SERIAL` / `AUTO_INCREMENT` integer PKs
- `VARCHAR`, `TEXT`
- `NUMERIC` / `DECIMAL` (monetary values)
- `INTEGER` / `INT`
- `BOOLEAN` / `TINYINT(1)`
- `TIMESTAMPTZ` (PostgreSQL) / `DATETIME` (MySQL)
- `ENUM` (order status in both databases)

---

## Suggested Test Scenarios

### Connection & Schema Browsing
1. Add a PostgreSQL connection with the details above — verify the database tree populates with `sampledb`.
2. Expand the tree: confirm `categories`, `products`, `users`, `orders`, `order_items` tables appear.
3. Verify the `order_summary` view appears under Views.
4. Verify `user_total_spent` (PostgreSQL) and `get_user_orders` (MySQL) appear under Routines.
5. Repeat steps 1–4 for the MySQL connection.

### Table Structure
- Open `products` → Structure tab: verify `price` is `NUMERIC(10,2)`, `stock` is `INTEGER`, `sku` has a UNIQUE constraint.
- Open `order_items` → verify FK constraints to `orders` and `products` are shown.

### Table Data & Pagination
- Open `products` → Data tab: 30 rows — test pagination if page size is set below 30.
- Open `order_items` → 44 rows across 20 orders.
- Filter `orders` by `status = 'cancelled'` — should return 2 rows.

### SQL Editor
Run these queries to test the editor:

```sql
-- Join orders with customers
SELECT o.id, o.status, o.total, u.first_name, u.last_name
FROM orders o
JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC;

-- Aggregate: revenue by category
SELECT c.name AS category, COUNT(p.id) AS products, SUM(oi.quantity * oi.unit_price) AS revenue
FROM categories c
JOIN products p    ON p.category_id = c.id
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o       ON o.id = oi.order_id AND o.status != 'cancelled'
GROUP BY c.name
ORDER BY revenue DESC;

-- PostgreSQL only: call function
SELECT user_total_spent(1);

-- Products below 50 units stock
SELECT name, stock, sku FROM products WHERE stock < 50 ORDER BY stock;
```

### CRUD Operations
- **Insert**: add a new row in `categories` — set name to `'Test Category'`.
- **Edit**: update a product's `stock` value inline.
- **Delete**: delete the test category row.

### ERD Generation
- Open the ERD feature on `sampledb` — verify all 5 tables and their FK relationships render correctly.

### Schema Diff
- Connect to both PostgreSQL and MySQL `sampledb` — run a schema diff and observe the minor dialect differences (e.g., `TIMESTAMPTZ` vs `DATETIME`, `BOOLEAN` vs `TINYINT`).

---

## File Structure

```
testdb/
├── docker-compose.yml         # PostgreSQL + MySQL services
├── README.md                  # This file
└── seed/
    ├── postgres/
    │   ├── 01_schema.sql      # Tables, indexes, view, function
    │   └── 02_data.sql        # 5 categories, 30 products, 15 users, 20 orders, 44 line items
    └── mysql/
        ├── 01_schema.sql      # Tables, indexes, view, stored procedure
        └── 02_data.sql        # Same dataset adapted for MySQL syntax
```

Seed scripts run automatically on first container start via the `docker-entrypoint-initdb.d` mechanism. To re-seed from scratch, run `docker compose down -v && docker compose up -d`.

---

## Troubleshooting

**Port conflict** — the containers use host ports `5433` (PostgreSQL) and `3307` (MySQL) to avoid clashing with locally-installed database servers. If those ports are also in use, edit `docker-compose.yml` and change the left side of the port mapping (e.g., `"5434:5432"`).

**MySQL takes longer to start** — MySQL 8 initialises slower than PostgreSQL on first run. Wait until `docker compose ps` shows `(healthy)` before connecting.

**Seed did not apply** — volumes persist data between restarts. If the schema already exists the init scripts are skipped. Run `docker compose down -v` to wipe volumes and re-apply seed.
