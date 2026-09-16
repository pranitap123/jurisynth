import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppShell() {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  function logout() {
    setToken(null);
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="sidebar__mark">
          <span className="nav__mark-glyph" aria-hidden="true" />
          Jurisynth
        </Link>
        <nav>
          <NavLink to="/app" end>Cases</NavLink>
          <NavLink to="/app/search">Search</NavLink>
          <NavLink to="/app/risk">Risk score</NavLink>
          <NavLink to="/app/mfa-setup">Security</NavLink>
        </nav>
        <button className="btn" onClick={logout} style={{ marginTop: "auto" }}>Log out</button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
