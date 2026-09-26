-- Payments + link service bookings to auth users
ALTER TABLE service_appointments
  ADD COLUMN IF NOT EXISTS customer_user_id TEXT;

ALTER TABLE trade_in_estimates
  ADD COLUMN IF NOT EXISTS customer_user_id TEXT;

ALTER TABLE auto_orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES auto_orders(id),
  customer_id TEXT NOT NULL,
  amount_inr BIGINT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_service_appt_user ON service_appointments (customer_user_id);
