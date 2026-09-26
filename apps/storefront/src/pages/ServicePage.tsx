import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { automobileApi } from "../api/automobile";

export function ServicePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<
    { id: string; vehicleReg: string; serviceType: string; slot: string; status: string }[]
  >([]);
  const [form, setForm] = useState({
    phone: "",
    vehicleReg: "",
    serviceType: "Periodic service",
    slot: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
    dealershipId: "d-blr-01",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/service");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user?.phone) setForm((f) => ({ ...f, phone: user.phone ?? "" }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    automobileApi
      .myServiceAppointments()
      .then((r) => setMine(r.items))
      .catch(() => undefined);
  }, [user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = await automobileApi.serviceBooking({
        phone: form.phone,
        vehicleReg: form.vehicleReg,
        serviceType: form.serviceType,
        slot: new Date(form.slot).toISOString(),
        dealershipId: form.dealershipId,
      });
      setMsg(`Service booked: ${r.id}`);
      const list = await automobileApi.myServiceAppointments();
      setMine(list.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "booking_failed");
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
      <h1>Workshop appointment</h1>
      <p>
        Booking as <strong>{user.fullName}</strong>
      </p>
      <form onSubmit={submit}>
        <input
          required
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          required
          placeholder="Registration no."
          value={form.vehicleReg}
          onChange={(e) => setForm({ ...form, vehicleReg: e.target.value })}
        />
        <input
          required
          type="datetime-local"
          value={form.slot}
          onChange={(e) => setForm({ ...form, slot: e.target.value })}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Booking…" : "Book service"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
      {mine.length > 0 && (
        <ul className="orders-list">
          {mine.map((a) => (
            <li key={a.id} className="card">
              <strong>{a.id}</strong> · {a.status}
              <br />
              {a.vehicleReg} · {a.serviceType}
              <br />
              <span className="muted">{new Date(a.slot).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
