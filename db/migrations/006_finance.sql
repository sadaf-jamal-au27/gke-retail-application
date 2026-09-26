-- Finance applications linked to users and orders
CREATE TABLE IF NOT EXISTS finance_applications (
  id                TEXT PRIMARY KEY,
  customer_user_id  TEXT NOT NULL,
  order_id          TEXT REFERENCES auto_orders(id),
  vehicle_id        TEXT NOT NULL,
  on_road_price_inr BIGINT NOT NULL,
  down_payment_inr  BIGINT NOT NULL,
  tenure_months     INT NOT NULL,
  apr_percent       NUMERIC(5,2) NOT NULL DEFAULT 9.5,
  principal_inr     BIGINT NOT NULL,
  emi_inr           BIGINT NOT NULL,
  total_payable_inr BIGINT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | disbursed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_user ON finance_applications (customer_user_id);
CREATE INDEX IF NOT EXISTS idx_finance_order ON finance_applications (order_id);
