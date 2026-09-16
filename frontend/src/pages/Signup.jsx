import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Nav from "../components/Nav";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.signup(email, password);
      setToken(res.access_token);
      // Route to MFA setup rather than straight to the dashboard — signing
      // up without ever seeing the MFA option means most people never
      // enable it. It's still skippable from there.
      navigate("/app/mfa-setup");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav minimal />
      <div className="auth-shell bg-mesh">
      <div className="auth-card">
        <h1>Create your workspace</h1>
        <p className="sub">One account, isolated case data.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn--solid" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>

        <p className="switch">Already have one? <Link to="/login">Log in</Link></p>
      </div>
      </div>
    </>
  );
}
