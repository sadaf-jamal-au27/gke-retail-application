import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LiveStatsBar } from "./LiveStatsBar";

const links = [
  { to: "/", label: "New cars" },
  { to: "/dealerships", label: "Dealerships" },
  { to: "/test-drive", label: "Test drive" },
  { to: "/finance", label: "Finance" },
  { to: "/service", label: "Service" },
  { to: "/trade-in", label: "Sell / exchange" },
  { to: "/orders", label: "My orders" },
];

export function SiteHeader() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">AD</span>
          <span>
            AutoDrive <em>Motors</em>
          </span>
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")} end={l.to === "/"}>
              {l.label}
            </NavLink>
          ))}
          {!loading &&
            (user ? (
              <span className="nav-user">
                <span className="nav-link muted-inline">{user.fullName}</span>
                <button type="button" className="nav-link linkish" onClick={() => void logout()}>
                  Sign out
                </button>
              </span>
            ) : (
              <NavLink to="/login" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                Sign in
              </NavLink>
            ))}
        </nav>
      </div>
      <LiveStatsBar />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <strong>AutoDrive Motors</strong>
          <p>Authorized multi-brand retailer. Prices ex-showroom; on-road calculated per RTO norms.</p>
        </div>
        <div>
          <strong>Support</strong>
          <p>1800-400-1001 · support@autodrive.example</p>
        </div>
      </div>
    </footer>
  );
}
