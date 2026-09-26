-- Harden commerce: link bookings/orders to auth users + reserved inventory
ALTER TABLE test_drive_bookings
  ADD COLUMN IF NOT EXISTS customer_user_id TEXT;

ALTER TABLE auto_orders
  ADD COLUMN IF NOT EXISTS cart_id TEXT,
  ADD COLUMN IF NOT EXISTS reserved_vin TEXT;

CREATE INDEX IF NOT EXISTS idx_test_drives_user ON test_drive_bookings (customer_user_id);
CREATE INDEX IF NOT EXISTS idx_auto_orders_customer ON auto_orders (customer_id);
