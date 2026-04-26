-- ============================================================
-- PostgreSQL seed — sample data
-- DB Assistant test database
-- ============================================================

-- Categories
INSERT INTO categories (name, description) VALUES
    ('Electronics',   'Consumer electronics and accessories'),
    ('Books',         'Physical and digital books'),
    ('Clothing',      'Apparel and accessories'),
    ('Home & Garden', 'Furniture, tools, and garden supplies'),
    ('Sports',        'Sports equipment and activewear');

-- Products (30 rows — enough to test pagination)
INSERT INTO products (category_id, name, description, price, stock, sku) VALUES
    (1, 'Wireless Keyboard',     'Compact Bluetooth keyboard, multi-device',       49.99,  120, 'ELEC-WKB-001'),
    (1, 'USB-C Hub 7-in-1',      '4K HDMI, USB-A ×3, SD, PD charging',            39.99,   85, 'ELEC-HUB-001'),
    (1, 'Noise-Cancelling Headphones', 'Over-ear ANC headphones, 30 h battery',   129.00,   40, 'ELEC-NCH-001'),
    (1, 'Webcam 1080p',          'Full HD webcam with built-in mic',               69.95,   60, 'ELEC-CAM-001'),
    (1, 'External SSD 1 TB',     'USB 3.2 Gen 2, 1050 MB/s read',                 99.00,   55, 'ELEC-SSD-001'),
    (1, 'Smart Power Strip',     '4-outlet with USB-A and USB-C, energy monitor',  34.99,  200, 'ELEC-PST-001'),
    (2, 'Clean Code',            'Robert C. Martin — software craftsmanship',       35.00,   30, 'BOOK-CCO-001'),
    (2, 'Designing Data-Intensive Applications', 'Martin Kleppmann',               55.00,   25, 'BOOK-DDA-001'),
    (2, 'The Pragmatic Programmer', '20th Anniversary Edition',                    45.00,   18, 'BOOK-TPP-001'),
    (2, 'Database Internals',    'Alex Petrov — deep dive into storage engines',   50.00,   22, 'BOOK-DBI-001'),
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
    (5, 'Adjustable Dumbbells',  '5–32.5 kg, space-saving design',                299.00,   20, 'SPRT-ADB-001'),
    (5, 'Running Watch GPS',     'Heart rate, GPS, sleep tracking, 2-week battery', 199.00, 30, 'SPRT-RWG-001'),
    (5, 'Resistance Band Set',   '5 levels, door anchor and handles included',      18.00,  350, 'SPRT-RBS-001'),
    (5, 'Foam Roller',           'High density, 45 cm, grid texture',               22.00,  180, 'SPRT-FRM-001'),
    (1, 'Mechanical Keyboard',   'Tactile switches, RGB backlight, TKL layout',    109.00,   65, 'ELEC-MKB-001'),
    (1, 'Monitor Light Bar',     'Asymmetric lighting, USB powered, no glare',      39.00,  100, 'ELEC-MLB-001'),
    (2, 'Staff Engineer',        'Will Larson — leadership beyond management',       40.00,   15, 'BOOK-STE-001'),
    (4, 'Standing Desk Mat',     'Anti-fatigue, ergonomic, 90 × 60 cm',             49.00,   80, 'HOME-SDM-001'),
    (3, 'Compression Socks',     'Graduated compression, EU 38–47, 3-pack',         19.00,  500, 'CLTH-CPS-001');

-- Users (15 users)
INSERT INTO users (first_name, last_name, email, phone, is_active) VALUES
    ('Alice',   'Nguyen',    'alice.nguyen@example.com',    '+1-555-0101', TRUE),
    ('Bob',     'Martínez',  'bob.martinez@example.com',    '+1-555-0102', TRUE),
    ('Carol',   'Osei',      'carol.osei@example.com',      '+1-555-0103', TRUE),
    ('David',   'Park',      'david.park@example.com',      '+1-555-0104', TRUE),
    ('Eva',     'Müller',    'eva.muller@example.com',      '+49-555-0105', TRUE),
    ('Frank',   'Rossi',     'frank.rossi@example.com',     '+39-555-0106', FALSE),
    ('Grace',   'Kim',       'grace.kim@example.com',       '+82-555-0107', TRUE),
    ('Hiro',    'Tanaka',    'hiro.tanaka@example.com',     '+81-555-0108', TRUE),
    ('Ifeoma',  'Adeyemi',   'ifeoma.adeyemi@example.com',  '+234-555-0109', TRUE),
    ('Jake',    'Brennan',   'jake.brennan@example.com',    '+1-555-0110', TRUE),
    ('Kofi',    'Asante',    'kofi.asante@example.com',     '+233-555-0111', TRUE),
    ('Lena',    'Volkova',   'lena.volkova@example.com',    '+7-555-0112', FALSE),
    ('Marco',   'DaSilva',   'marco.dasilva@example.com',   '+55-555-0113', TRUE),
    ('Nadia',   'Petrov',    'nadia.petrov@example.com',    '+7-555-0114', TRUE),
    ('Oscar',   'Jensen',    'oscar.jensen@example.com',    '+45-555-0115', TRUE);

-- Orders (20 orders across various statuses)
INSERT INTO orders (user_id, status, total, notes, created_at, shipped_at) VALUES
    (1,  'delivered',  179.98, NULL,                    '2026-01-05 09:12:00+00', '2026-01-07 14:00:00+00'),
    (1,  'delivered',   35.00, 'Gift wrapping requested','2026-01-20 11:30:00+00', '2026-01-22 10:00:00+00'),
    (2,  'delivered',  229.00, NULL,                    '2026-01-15 08:45:00+00', '2026-01-18 09:00:00+00'),
    (3,  'shipped',    168.00, NULL,                    '2026-02-01 13:00:00+00', '2026-02-03 11:00:00+00'),
    (4,  'processing', 299.00, 'Large item, no PO box', '2026-02-10 16:22:00+00', NULL),
    (5,  'delivered',   83.99, NULL,                    '2026-01-28 10:10:00+00', '2026-01-30 12:00:00+00'),
    (6,  'cancelled',   45.00, 'Customer request',      '2026-02-05 07:55:00+00', NULL),
    (7,  'delivered',  357.00, NULL,                    '2026-01-10 09:00:00+00', '2026-01-13 15:00:00+00'),
    (8,  'pending',    109.00, NULL,                    '2026-02-18 18:40:00+00', NULL),
    (9,  'delivered',   56.00, NULL,                    '2026-01-22 12:00:00+00', '2026-01-24 10:00:00+00'),
    (10, 'shipped',    248.95, 'Leave at door',         '2026-02-12 14:30:00+00', '2026-02-14 09:00:00+00'),
    (11, 'delivered',   97.99, NULL,                    '2026-01-18 09:30:00+00', '2026-01-20 08:00:00+00'),
    (12, 'cancelled',  119.00, 'Duplicate order',       '2026-01-30 20:00:00+00', NULL),
    (13, 'processing', 188.00, NULL,                    '2026-02-16 11:00:00+00', NULL),
    (14, 'delivered',   76.00, NULL,                    '2026-01-12 10:00:00+00', '2026-01-14 13:00:00+00'),
    (15, 'pending',     60.00, NULL,                    '2026-02-19 09:00:00+00', NULL),
    (1,  'processing', 199.00, NULL,                    '2026-02-17 15:45:00+00', NULL),
    (3,  'delivered',  129.00, NULL,                    '2026-01-08 08:00:00+00', '2026-01-10 11:00:00+00'),
    (7,  'shipped',     77.99, NULL,                    '2026-02-11 13:00:00+00', '2026-02-13 10:00:00+00'),
    (10, 'delivered',   55.00, NULL,                    '2026-01-25 16:00:00+00', '2026-01-27 14:00:00+00');

-- Order items (maps to realistic order totals above)
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    -- Order 1 (Alice, $179.98): wireless keyboard + USB hub + yoga mat
    (1, 1,  1, 49.99),
    (1, 2,  1, 39.99),
    (1, 21, 1, 38.00),
    (1, 24, 3, 18.00),  -- 3× resistance bands
    -- Order 2 (Alice, $35.00): Clean Code book
    (2, 7,  1, 35.00),
    -- Order 3 (Bob, $229.00): headphones + book
    (3, 3,  1, 129.00),
    (3, 8,  1, 55.00),
    (3, 9,  1, 45.00),
    -- Order 4 (Carol, $168.00): jacket + boots
    (4, 13, 1, 119.00),
    (4, 14, 1, 18.00),
    (4, 30, 1, 19.00),
    -- Order 5 (David, $299.00): adjustable dumbbells
    (5, 22, 1, 299.00),
    -- Order 6 (Eva, $83.99): webcam + hub
    (6, 4,  1, 69.95),
    (6, 2,  1, 39.99),
    -- Order 7 (Frank, $45.00 cancelled): beanie ×2 + socks
    (7, 14, 2, 18.00),
    (7, 30, 1, 19.00),
    -- Order 8 (Grace, $357.00): dumbbells + running watch
    (8, 22, 1, 299.00),
    (8, 23, 1, 199.00),
    (8, 24, 2, 18.00),
    (8, 25, 1, 22.00),
    -- Order 9 (Hiro, $109.00): mechanical keyboard
    (9, 26, 1, 109.00),
    -- Order 10 (Ifeoma, $56.00): books
    (10, 7,  1, 35.00),
    (10, 28, 1, 40.00),
    -- Order 11 (Jake, $248.95): SSD + light bar + keyboard
    (11, 5,  1, 99.00),
    (11, 27, 1, 39.00),
    (11, 1,  1, 49.99),
    (11, 24, 3, 18.00),
    -- Order 12 (Kofi, $97.99): yoga mat + foam roller + bands
    (12, 21, 1, 38.00),
    (12, 25, 1, 22.00),
    (12, 24, 2, 18.00),
    -- Order 13 (Lena, $119.00 cancelled): smart thermostat
    (13, 20, 1, 119.00),
    -- Order 14 (Marco, $188.00): drill set + grow light + compost bin
    (14, 17, 1, 89.00),
    (14, 18, 1, 42.00),
    (14, 19, 1, 27.00),
    -- Order 15 (Nadia, $76.00): books
    (15, 10, 1, 50.00),
    (15, 9,  1, 45.00),
    -- Order 16 (Oscar, $60.00 pending): beanie ×2 + socks ×2
    (16, 14, 2, 18.00),
    (16, 30, 2, 19.00),
    -- Order 17 (Alice, $199.00 processing): running watch
    (17, 23, 1, 199.00),
    -- Order 18 (Carol, $129.00): headphones
    (18, 3,  1, 129.00),
    -- Order 19 (Grace, $77.99): books
    (19, 7,  1, 35.00),
    (19, 28, 1, 40.00),
    -- Order 20 (Jake, $55.00): standing desk mat
    (20, 29, 1, 49.00),
    (20, 24, 1, 18.00);
