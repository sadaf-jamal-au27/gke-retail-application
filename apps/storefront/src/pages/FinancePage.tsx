import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { automobileApi, inr } from "../api/automobile";

type Application = {
  id: string;
  vehicleId: string;
  orderId: string | null;
  emiInr: number;
  principalInr: number;
  totalPayableInr: number;
  tenureMonths: number;
  aprPercent: number;
  status: string;
  createdAt: string;
};

export function FinancePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    vehicleId: "v-hyundai-creta",
    onRoadPriceInr: 1500000,
    downPaymentInr: 300000,
    tenureMonths: 60,
  });

  const [preview, setPreview] = useState<{
    emiInr: number;
    principalInr: number;
    totalPayableInr: number;
    aprPercent: number;
  } | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/finance");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    automobileApi.myFinanceApplications().then((r) => setApplications(r.items)).catch(() => undefined);
  }, [user]);

  async function calcEmi(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const r = await automobileApi.financeEmi({
        onRoadPriceInr: form.onRoadPriceInr,
        downPaymentInr: form.downPaymentInr,
        tenureMonths: form.tenureMonths,
      });
      setPreview(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "calc_failed");
    }
  }

  async function apply() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const r = await automobileApi.financeApply({
        vehicleId: form.vehicleId,
        onRoadPriceInr: form.onRoadPriceInr,
        downPaymentInr: form.downPaymentInr,
        tenureMonths: form.tenureMonths,
      });
      setSuccess(`Application ${r.id} — ${r.status.toUpperCase()} · EMI ${inr(r.emiInr)}/mo`);
      const updated = await automobileApi.myFinanceApplications();
      setApplications(updated.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "application_failed");
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
      <h1>Finance</h1>
      <p>
        Applying as <strong>{user.fullName}</strong>
      </p>

      <form onSubmit={calcEmi}>
        <label className="stack-form">
          Vehicle ID
          <input
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            placeholder="v-hyundai-creta"
          />
        </label>
        <label className="stack-form">
          On-road price (₹)
          <input
            type="number"
            value={form.onRoadPriceInr}
            min={100000}
            onChange={(e) => setForm({ ...form, onRoadPriceInr: Number(e.target.value) })}
          />
        </label>
        <label className="stack-form">
          Down payment (₹)
          <input
            type="number"
            value={form.downPaymentInr}
            min={0}
            onChange={(e) => setForm({ ...form, downPaymentInr: Number(e.target.value) })}
          />
        </label>
        <label className="stack-form">
          Tenure (months)
          <input
            type="number"
            value={form.tenureMonths}
            min={6}
            max={120}
            step={6}
            onChange={(e) => setForm({ ...form, tenureMonths: Number(e.target.value) })}
          />
        </label>
        <button type="submit">Calculate EMI</button>
      </form>

      {preview && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <p>
            Principal: <strong>{inr(preview.principalInr)}</strong>
          </p>
          <p>
            EMI: <strong className="price">{inr(preview.emiInr)}/month</strong> @ {preview.aprPercent}% APR
          </p>
          <p>
            Total payable: {inr(preview.totalPayableInr)} over {form.tenureMonths} months
          </p>
          <button type="button" onClick={apply} disabled={busy}>
            {busy ? "Submitting…" : "Apply for loan"}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {applications.length > 0 && (
        <>
          <h2 style={{ marginTop: "2rem" }}>My applications</h2>
          <ul className="orders-list">
            {applications.map((a) => (
              <li key={a.id} className="card">
                <strong>{a.id}</strong> ·{" "}
                <span
                  style={{
                    color:
                      a.status === "approved"
                        ? "green"
                        : a.status === "rejected"
                        ? "red"
                        : "orange",
                  }}
                >
                  {a.status.toUpperCase()}
                </span>
                <br />
                Vehicle: {a.vehicleId}
                {a.orderId ? ` · Order: ${a.orderId}` : ""}
                <br />
                EMI: {inr(a.emiInr)}/mo · {a.tenureMonths} months @ {a.aprPercent}% APR
                <br />
                Principal: {inr(a.principalInr)} · Total: {inr(a.totalPayableInr)}
                <br />
                <span className="muted">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
