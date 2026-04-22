import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAuthToken } from "../api";
import { saveAuth } from "../authStore";

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@smartseason.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      saveAuth({ token: res.data.token, user: res.data.user });
      setAuthToken(res.data.token);
      nav("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card-narrow">
      <h1>Login</h1>
      <p className="muted">
        Use demo credentials from the README. (Admin/Agent)
      </p>
      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <div className="alert">{error}</div> : null}
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

