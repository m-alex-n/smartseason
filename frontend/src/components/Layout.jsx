import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuth, loadAuth } from "../authStore";

function badgeClass(role) {
  return role === "ADMIN" ? "badge badge-admin" : "badge badge-agent";
}

export function Layout({ children }) {
  const nav = useNavigate();
  const { user } = loadAuth();

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            SmartSeason
          </Link>
          <nav className="nav">
            <NavLink to="/dashboard">Dashboard</NavLink>
            {user?.role === "ADMIN" ? <NavLink to="/admin">Admin</NavLink> : null}
          </nav>
          <div className="right">
            {user ? (
              <>
                <span className={badgeClass(user.role)}>{user.role}</span>
                <span className="muted">{user.email}</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    clearAuth();
                    nav("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link className="btn btn-primary" to="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className="footer">SmartSeason Field Monitoring • Demo</footer>
    </div>
  );
}

