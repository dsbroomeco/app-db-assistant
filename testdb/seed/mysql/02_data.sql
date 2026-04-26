-- ============================================================
-- MySQL seed — sample data
-- DB Assistant test database
-- ============================================================

USE sampledb;

-- Categories
INSERT INTO categories (name, description) VALUES
    ('Electronics',   'Consumer electronics and accessories'),
    ('Books',         'Physical and digital books'),
    ('Clothing',      'Apparel and accessories'),
    ('Home & Garden', 'Furniture, tools, and garden supplies'),
    ('Sports',        'Sports equipment and activewear');

-- Products (30 rows)
INSERT INTO products (category_id, name, description, price, stock, sku) VALUES
    (1, 'Wireless Keyboard',     'Compact Bluetooth keyboard, multi-device',       49.99,  120, 'ELEC-WKB-001'),
    (1, 'USB-C Hub 7-in-1',      '4K HDMI, USB-A x3, SD, PD charging',            39.99,   85, 'ELEC-HUB-001'),
    (1, 'Noise-Cancelling Headphones', 'Over-ear ANC headphones, 30 h battery',   129.00,   40, 'ELEC-NCH-001'),
    (1, 'Webcam 1080p',          'Full HD webcam with built-in mic',               69.95,   60, 'ELEC-CAM-001'),
    (1, 'External SSD 1 TB',     'USB 3.2 Gen 2, 1050 MB/s read',                 99.00,   55, 'ELEC-SSD-001'),
    (1, 'Smart Power Strip',     '4-outlet with USB-A and USB-C, energy monitor',  34.99,  200, 'ELEC-PST-001'),
    (2, 'Clean Code',            'Robert C. Martin - software craftsmanship',       35.00,   30, 'BOOK-CCO-001'),
    (2, 'Designing Data-Intensive Applications', 'Martin Kleppmann',               55.00,   25, 'BOOK-DDA-001'),
    (2, 'The Pragmatic Programmer', '20th Anniversary Edition',                    45.00,   18, 'BOOK-TPP-001'),
    (2, 'Database Internals',    'Alex Petrov - deep dive into storage engines',   50.00,   22, 'BOOK-DBI-001'),
    (3, 'Merino Wool T-Shirt',   'Natural fibre, machine washable, unisex',        32.00,  300, 'CLTH-MWT-001'),
    (3, 'Trail Running Shorts',  'Lightweight, reflective, inner liner',            28.00,  180, 'CLTH-TRS-001'),
    (3, 'Insulated Jacket',      'Water-resistant shell, 3-in-1 design',          119.00,   75, 'CLTH-INJ-001'),
    (3, 'Wool Beanie',           'Ribbed knit, one size fits most',                18.00,  400, 'CLTH-WBN-001'),
    (3, 'Waterproof Boots',      'Gore-Tex lined, ankle support',                  149.00,   50, 'CLTH-WBT-001'),
    (4, 'Bamboo Desk Organiser', '6 compartments, sustainable bamboo',             24.99,  150, 'HOME-BDO-001'),
    (4, 'Cordless Drill Set',    '18V, 2 batteries, 42-piece bit set',              89.00,   35, 'HOME-CDS-001'),
    (4, 'LED Grow Light',        'Full spectrum, 45W, adjustable arm',              42.00,   90, 'HOME-LGL-001'),
    (4, 'Compost Bin 15L',       'Odour-lock lid, indoor kitchen composting',       27.00,  110, 'HOME-CPB-001'),
    (4, 'Smart Thermostat',      'Wi-Fi, works with Alexa and Google Home',        119.00,   45, 'HOME-STT-001'),
    (5, 'Yoga Mat Pro',          '6mm thick, non-slip, carrying strap included',    38.00,  200, 'SPRT-YMP-001'),
    (5, 'Adjustable Dumbbells',  '5-32.5 kg, space-saving design',                299.00,   20, 'SPRT-ADB-001'),
    (5, 'Running Watch GPS',     'Heart rate, GPS, sleep tracking, 2-week battery', 199.00,  30, 'SPRT-RWG-001'),
    (5, 'Resistance Band Set',   '5 levels, door anchor and handles included',      18.00,  350, 'SPRT-RBS-001'),
    (5, 'Foam Roller',           'High density, 45 cm, grid texture',               22.00,  180, 'SPRT-FRM-001'),
    (1, 'Mechanical Keyboard',   'Tactile switches, RGB backlight, TKL layout',    109.00,   65, 'ELEC-MKB-001'),
    (1, 'Monitor Light Bar',     'Asymmetric lighting, USB powered, no glare',      39.00,  100, 'ELEC-MLB-001'),
    (2, 'Staff Engineer',        'Will Larson - leadership beyond management',       40.00,   15, 'BOOK-STE-001'),
    (4, 'Standing Desk Mat',     'Anti-fatigue, ergonomic, 90 x 60 cm',             49.00,   80, 'HOME-SDM-001'),
    (3, 'Compression Socks',     'Graduated compression, EU 38-47, 3-pack',         19.00,  500, 'CLTH-CPS-001');

-- Users
INSERT INTO users (first_name, last_name, email, phone, is_active) VALUES
    ('Alice',   'Nguyen',    'alice.nguyen@example.com',    '+1-555-0101', 1),
    ('Bob',     'Martinez',  'bob.martinez@example.com',    '+1-555-0102', 1),
    ('Carol',   'Osei',      'carol.osei@example.com',      '+1-555-0103', 1),
    ('David',   'Park',      'david.park@example.com',      '+1-555-0104', 1),
    ('Eva',     'Muller',    'eva.muller@example.com',      '+49-555-0105', 1),
    ('Frank',   'Rossi',     'frank.rossi@example.com',     '+39-555-0106', 0),
    ('Grace',   'Kim',       'grace.kim@example.com',       '+82-555-0107', 1),
    ('Hiro',    'Tanaka',    'hiro.tanaka@example.com',     '+81-555-0108', 1),
    ('Ifeoma',  'Adeyemi',   'ifeoma.adeyemi@example.com',  '+234-555-0109', 1),
    ('Jake',    'Brennan',   'jake.brennan@example.com',    '+1-555-0110', 1),
    ('Kofi',    'Asante',    'kofi.asante@example.com',     '+233-555-0111', 1),
    ('Lena',    'Volkova',   'lena.volkova@example.com',    '+7-555-0112', 0),
    ('Marco',   'DaSilva',   'marco.dasilva@example.com',   '+55-555-0113', 1),
    ('Nadia',   'Petrov',    'nadia.petrov@example.com',    '+7-555-0114', 1),
    ('Oscar',   'Jensen',    'oscar.jensen@example.com',    '+45-555-0115', 1);

-- Orders
INSERT INTO orders (user_id, status, total, notes, created_at, shipped_at) VALUES
    (1,  'delivered',  179.98, NULL,                    '2026-01-05 09:12:00', '2026-01-07 14:00:00'),
    (1,  'delivered',   35.00, 'Gift wrapping requested','2026-01-20 11:30:00', '2026-01-22 10:00:00'),
    (2,  'delivered',  229.00, NULL,                    '2026-01-15 08:45:00', '2026-01-18 09:00:00'),
    (3,  'shipped',    168.00, NULL,                    '2026-02-01 13:00:00', '2026-02-03 11:00:00'),
    (4,  'processing', 299.00, 'Large item, no PO box', '2026-02-10 16:22:00', NULL),
    (5,  'delivered',   83.99, NULL,                    '2026-01-28 10:10:00', '2026-01-30 12:00:00'),
    (6,  'cancelled',   45.00, 'Customer request',      '2026-02-05 07:55:00', NULL),
    (7,  'delivered',  357.00, NULL,                    '2026-01-10 09:00:00', '2026-01-13 15:00:00'),
    (8,  'pending',    109.00, NULL,                    '2026-02-18 18:40:00', NULL),
    (9,  'delivered',   56.00, NULL,                    '2026-01-22 12:00:00', '2026-01-24 10:00:00'),
    (10, 'shipped',    248.95, 'Leave at door',         '2026-02-12 14:30:00', '2026-02-14 09:00:00'),
    (11, 'delivered',   97.99, NULL,                    '2026-01-18 09:30:00', '2026-01-20 08:00:00'),
    (12, 'cancelled',  119.00, 'Duplicate order',       '2026-01-30 20:00:00', NULL),
    (13, 'processing', 188.00, NULL,                    '2026-02-16 11:00:00', NULL),
    (14, 'delivered',   76.00, NULL,                    '2026-01-12 10:00:00', '2026-01-14 13:00:00'),
    (15, 'pending',     60.00, NULL,                    '2026-02-19 09:00:00', NULL),
    (1,  'processing', 199.00, NULL,                    '2026-02-17 15:45:00', NULL),
    (3,  'delivered',  129.00, NULL,                    '2026-01-08 08:00:00', '2026-01-10 11:00:00'),
    (7,  'shipped',     77.99, NULL,                    '2026-02-11 13:00:00', '2026-02-13 10:00:00'),
    (10, 'delivered',   55.00, NULL,                    '2026-01-25 16:00:00', '2026-01-27 14:00:00');

-- Order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1,  1, 49.99),
    (1, 2,  1, 39.99),
    (1, 21, 1, 38.00),
    (1, 24, 3, 18.00),
    (2, 7,  1, 35.00),
    (3, 3,  1, 129.00),
    (3, 8,  1, 55.00),
    (3, 9,  1, 45.00),
    (4, 13, 1, 119.00),
    (4, 14, 1, 18.00),
    (4, 30, 1, 19.00),
    (5, 22, 1, 299.00),
    (6, 4,  1, 69.95),
    (6, 2,  1, 39.99),
    (7, 14, 2, 18.00),
    (7, 30, 1, 19.00),
    (8, 22, 1, 299.00),
    (8, 23, 1, 199.00),
    (8, 24, 2, 18.00),
    (8, 25, 1, 22.00),
    (9, 26, 1, 109.00),
    (10, 7,  1, 35.00),
    (10, 28, 1, 40.00),
    (11, 5,  1, 99.00),
    (11, 27, 1, 39.00),
    (11, 1,  1, 49.99),
    (11, 24, 3, 18.00),
    (12, 21, 1, 38.00),
    (12, 25, 1, 22.00),
    (12, 24, 2, 18.00),
    (13, 20, 1, 119.00),
    (14, 17, 1, 89.00),
    (14, 18, 1, 42.00),
    (14, 19, 1, 27.00),
    (15, 10, 1, 50.00),
    (15, 9,  1, 45.00),
    (16, 14, 2, 18.00),
    (16, 30, 2, 19.00),
    (17, 23, 1, 199.00),
    (18, 3,  1, 129.00),
    (19, 7,  1, 35.00),
    (19, 28, 1, 40.00),
    (20, 29, 1, 49.00),
    (20, 24, 1, 18.00);

-- Reviews (~20 rows -- tests multi-FK table, SET NULL on user delete, CASCADE on product delete)
-- Columns: product_id, user_id (nullable), rating, title, body, verified
INSERT INTO reviews (product_id, user_id, rating, title, body, verified, created_at) VALUES
    (1,  1,  5, 'Great keyboard',         'Solid build, pairs instantly. Love it.',           1, '2026-01-10 08:00:00'),
    (1,  2,  4, 'Good but pricey',        'Works well, a bit expensive for what it is.',      0, '2026-01-12 09:30:00'),
    (3,  3,  5, 'Best headphones ever',   'ANC is superb, battery lasts forever.',            1, '2026-01-16 10:00:00'),
    (3,  7,  4, 'Very good ANC',          'Comfortable for long sessions.',                   1, '2026-01-20 14:00:00'),
    (3,  NULL, 2, 'Disappointed',         'Hurt my ears after an hour. Not for everyone.',    0, '2026-01-22 11:00:00'),
    (5,  4,  5, 'Fast and reliable',      'Speeds are as advertised. Great for backups.',     1, '2026-01-25 09:00:00'),
    (7,  1,  5, 'Changed how I code',     'Essential reading for any developer.',             1, '2026-01-21 16:00:00'),
    (7,  5,  4, 'Classic for a reason',   'Dense but worth it. Some examples feel dated.',    0, '2026-01-29 13:00:00'),
    (8,  2,  5, 'Must-read',              'Kleppmann explains distributed systems brilliantly.', 1, '2026-01-19 10:00:00'),
    (10, 9,  4, 'Deep and thorough',      'Not for beginners but incredibly detailed.',       0, '2026-01-23 11:30:00'),
    (13, 3,  3, 'Decent jacket',          'Keeps warm but the zip feels a bit flimsy.',       1, '2026-02-04 09:00:00'),
    (15, NULL, 5, 'Fantastic boots',      'Totally waterproof, very comfortable on trails.',  0, '2026-02-06 15:00:00'),
    (21, 6,  4, 'Good grip',              'Nice and thick. Does not slip on hardwood.',        1, '2026-01-11 08:00:00'),
    (22, 7,  5, 'Game changer',           'Replaced my entire dumbbell rack. Highly recommend.', 1, '2026-01-14 12:00:00'),
    (23, 10, 4, 'Accurate GPS',           'GPS lock is fast. Battery outlasts the claim.',    1, '2026-02-15 10:00:00'),
    (23, NULL, 1, 'Stopped syncing',      'Lost all data after a firmware update.',           0, '2026-02-17 09:00:00'),
    (26, 11, 5, 'Satisfying to type on',  'Clicky switches are perfect, RGB is a bonus.',     1, '2026-01-19 17:00:00'),
    (29, 14, 4, 'Good anti-fatigue',      'My back feels better after a week of use.',        1, '2026-02-01 08:30:00'),
    (6,  13, 3, 'Does the job',           'Nothing special but reliable.',                    0, '2026-01-30 14:00:00'),
    (24, 15, 5, 'Great value',            'Five bands, door anchor, all solid quality.',      1, '2026-01-27 11:00:00');
