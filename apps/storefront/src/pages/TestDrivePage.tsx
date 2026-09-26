import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { automobileApi } from "../api/automobile";

export function TestDrivePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    vehicleId: (location.state as { vehicleId?: string })?.vehicleId ?? "v-hyundai-creta",
    dealershipId: "d-mum-01",
    customerPhone: "",
    slot: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?next=${encodeURIComponent("/test-drive")}`);
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user?.phone) setForm((f) => ({ ...f, customerPhone: user.phone ?? "" }));
  }, [user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await automobileApi.bookTestDrive({
        vehicleId: form.vehicleId,
        dealershipId: form.dealershipId,
        customerPhone: form.customerPhone,
        slot: new Date(form.slot).toISOString(),
      });
      setMsg(`Test drive confirmed: ${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "booking_failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <section className="form-page">
        <p>Sign in required…</p>
      </section>
    );
  }

  return (
    <section className="form-page">
      <h1>Book a test drive</h1>
      <p>
        Booking as <strong>{user.fullName}</strong>
      </p>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Vehicle id
          <input required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} />
        </label>
        <label>
          Dealership id
          <input required value={form.dealershipId} onChange={(e) => setForm({ ...form, dealershipId: e.target.value })} />
        </label>
        <label>
          Phone
          <input required value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </label>
        <label>
          Slot
          <input required type="datetime-local" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Booking…" : "Confirm slot"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
      <p>
        <Link to="/orders">View my orders</Link>
      </p>
    </section>
  );
}
