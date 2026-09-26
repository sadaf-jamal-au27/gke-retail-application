import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { automobileApi, inr } from "../api/automobile";

export function CheckoutPage() {
  const { vehicleId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dealershipId, setDealershipId] = useState("d-mum-01");
  const [dealers, setDealers] = useState<{ id: string; name: string; city: string }[]>([]);
  const [quote, setQuote] = useState<{ onRoadPriceInr: number } | null>(null);
  const [cartId, setCartId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reservedVin, setReservedVin] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user && vehicleId) {
      navigate(`/login?next=${encodeURIComponent(`/checkout/${vehicleId}`)}`);
    }
  }, [loading, user, vehicleId, navigate]);

  useEffect(() => {
    if (!vehicleId || !user) return;
    automobileApi.priceQuote(vehicleId).then(setQuote).catch(() => setError("quote_failed"));
    automobileApi.dealerships().then((r) => setDealers(r.items));
    automobileApi
      .upsertCart(vehicleId)
      .then((c) => setCartId(c.id))
      .catch(() => setError("cart_failed"));
  }, [vehicleId, user]);

  async function placeOrder() {
    if (!vehicleId || !quote || !user) return;
    setBusy(true);
    setError("");
    try {
      const r = await automobileApi.checkout({
        vehicleId,
        dealershipId,
        onRoadPriceInr: quote.onRoadPriceInr,
        cartId: cartId || undefined,
      });
      setOrderId(r.order.id);
      setReservedVin(r.order.reservedVin ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "checkout_failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <section className="form-page">
        <p>Checking account…</p>
      </section>
    );
  }

  return (
    <section className="form-page">
      <h1>Complete booking</h1>
      <p>
        Ordering as <strong>{user.fullName}</strong> ({user.email})
      </p>
      {quote ? <p>On-road amount: {inr(quote.onRoadPriceInr)}</p> : <p>Loading quote…</p>}
      {cartId && <p className="muted">Cart: {cartId}</p>}
      <label className="stack-form">
        Dealership
        <select value={dealershipId} onChange={(e) => setDealershipId(e.target.value)}>
          {dealers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.city}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={placeOrder} disabled={!quote || busy}>
        {busy ? "Placing…" : "Confirm order"}
      </button>
      {error && <p className="error">{error}</p>}
      {orderId && (
        <p className="success">
          Order placed: {orderId}
          {reservedVin ? ` · reserved VIN ${reservedVin}` : " · no VIN reserved (pipeline)"}
          . <Link to="/orders">Pay on My orders</Link>
        </p>
      )}
    </section>
  );
}
