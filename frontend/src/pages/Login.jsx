import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Nav from "../components/Nav";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  // Two states: password step, then (only if the backend says MFA is
  // required) a second step asking for the code. We don't ask for a code
  // up front for every user — only once the API tells us this account has
  // MFA enabled, matching how the backend's /auth/login is designed.
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password, needsMfa ? totpCode : undefined);
      setToken(res.access_token);
      navigate("/app");
    } catch (err) {
      if (err.message === "MFA code required") {
        setNeedsMfa(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav minimal />
      <div className="auth-shell bg-mesh">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Log in to your workspace.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!needsMfa && (
            <>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} />
              </div>
            </>
          )}

          {needsMfa && (
            <div className="field">
              <label htmlFor="totp">Authenticator code</label>
              <input id="totp" inputMode="numeric" autoFocus required
                value={totpCode} onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit code" />
            </div>
          )}

          <button className="btn btn--solid" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Checking…" : needsMfa ? "Verify and log in" : "Log in"}
          </button>
        </form>

        <p className="switch">No workspace yet? <Link to="/signup">Sign up</Link></p>
      </div>
      </div>
    </>
  );
}
