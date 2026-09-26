import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { automobileApi, inr } from "../api/automobile";

type OrderRow = {
  id: string;
  vehicleId: string;
  dealershipId: string;
  totalInr: number;
  status: string;
  paymentStatus: string;
  paidAt: string | null;
  reservedVin: string | null;
  createdAt: string;
};

export function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/orders");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    automobileApi
      .myOrders()
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : "orders_failed"));
  }, [user]);

  async function pay(orderId: string) {
    setPayingId(orderId);
    setError("");
    try {
      const r = await automobileApi.payOrder(orderId, "upi");
      setItems((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: r.order.status,
                paymentStatus: r.order.paymentStatus,
                paidAt: new Date().toISOString(),
              }
            : o
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "payment_failed");
    } finally {
      setPayingId("");
    }
  }

  if (loading || !user) {
    return (
      <section className="form-page">
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section className="form-page">
      <h1>My orders</h1>
      {error && <p className="error">{error}</p>}
      {items.length === 0 ? (
        <p className="muted">
          No orders yet. <Link to="/">Browse cars</Link>
        </p>
      ) : (
        <ul className="orders-list">
          {items.map((o) => (
            <li key={o.id} className="card">
              <strong>{o.id}</strong> · {o.status}
              <br />
              Payment: {o.paymentStatus}
              {o.paidAt ? ` · ${new Date(o.paidAt).toLocaleString()}` : ""}
              <br />
              Vehicle {o.vehicleId} · Dealer {o.dealershipId}
              <br />
              {inr(o.totalInr)}
              {o.reservedVin ? ` · VIN ${o.reservedVin}` : ""}
              <br />
              <span className="muted">{new Date(o.createdAt).toLocaleString()}</span>
              {o.paymentStatus !== "paid" && (
                <>
                  <br />
                  <button type="button" disabled={payingId === o.id} onClick={() => pay(o.id)}>
                    {payingId === o.id ? "Paying…" : "Pay with UPI (stub)"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
