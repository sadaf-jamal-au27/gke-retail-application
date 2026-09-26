import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { automobileApi, inr } from "../api/automobile";

export function TradeInPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState<number | null>(null);
  const [estimateId, setEstimateId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/trade-in");
  }, [loading, user, navigate]);

  async function estimate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setValue(null);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      const r = await automobileApi.tradeIn({
        make: String(form.get("make")),
        model: String(form.get("model")),
        year: Number(form.get("year")),
        kmDriven: Number(form.get("km")),
        condition: String(form.get("condition")),
      });
      setValue(r.valueInr);
      setEstimateId(r.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "estimate_failed");
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
      <h1>Instant trade-in valuation</h1>
      <p>
        Saved to your account as <strong>{user.fullName}</strong>
      </p>
      <form onSubmit={estimate}>
        <input name="make" required placeholder="Make" defaultValue="Maruti Suzuki" />
        <input name="model" required placeholder="Model" defaultValue="Swift" />
        <input name="year" type="number" required defaultValue={2019} />
        <input name="km" type="number" required defaultValue={45000} />
        <select name="condition" defaultValue="good">
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
        <button type="submit" disabled={busy}>
          {busy ? "Estimating…" : "Get estimate"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {value != null && (
        <p className="price">
          Offer: {inr(value)}
          {estimateId ? ` · ${estimateId}` : ""}
        </p>
      )}
    </section>
  );
}
