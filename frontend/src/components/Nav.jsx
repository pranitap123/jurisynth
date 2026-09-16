import { Link } from "react-router-dom";

export default function Nav({ minimal = false }) {
  return (
    <header className="nav">
      <Link to="/" className="nav__mark">
        <span className="nav__mark-glyph" aria-hidden="true" />
        Jurisynth AI
      </Link>
      {!minimal && (
        <div className="nav__links">
          <a href="/#how-it-works">How it works</a>
          <Link to="/login" className="btn">Log in</Link>
          <Link to="/signup" className="btn btn--solid">Sign up</Link>
        </div>
      )}
    </header>
  );
}
