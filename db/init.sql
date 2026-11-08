CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  customer_name VARCHAR(180) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'cancelled')),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory_items (quantity);

INSERT INTO inventory_items (sku, name, category, quantity, reorder_level, unit_price)
VALUES
  ('NET-110', 'Wi-Fi 6 Access Point', 'Networking', 22, 6, 139.00),
  ('NET-120', '24-Port Managed Switch', 'Networking', 4, 8, 289.00),
  ('HW-210', 'USB-C Business Dock', 'Hardware', 37, 10, 119.00),
  ('HW-220', 'Business Laptop Stand', 'Hardware', 3, 6, 42.50),
  ('ACC-310', 'Wireless Keyboard', 'Accessories', 54, 12, 34.99)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO orders (order_number, customer_name, status, total_amount)
VALUES
  ('ORD-10001', 'Northstar Logistics', 'pending', 1299.00),
  ('ORD-10002', 'Contoso Services', 'shipped', 749.50),
  ('ORD-10003', 'Summit Retail Group', 'processing', 2499.00),
  ('ORD-10004', 'Blue Ridge Consulting', 'pending', 312.75)
ON CONFLICT (order_number) DO NOTHING;
