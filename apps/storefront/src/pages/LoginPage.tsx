import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ email, password, fullName, phone: phone || undefined });
      }
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "auth_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-page auth-page">
      <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <p className="muted">Real accounts are stored in Postgres with hashed passwords and server sessions.</p>
      <form className="stack-form" onSubmit={onSubmit}>
        {mode === "register" && (
          <>
            <label>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
            </label>
            <label>
              Phone (optional)
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
        </button>
      </form>
      <p>
        {mode === "login" ? (
          <>
            New here?{" "}
            <button type="button" className="linkish" onClick={() => setMode("register")}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" className="linkish" onClick={() => setMode("login")}>
              Sign in
            </button>
          </>
        )}
      </p>
      <p>
        <Link to="/">Back to cars</Link>
      </p>
    </section>
  );
}
