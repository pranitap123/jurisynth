import { useState } from "react";
import { api } from "../api/client";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.searchCases(query);
      setResults(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Search</h1>
      <div className="panel">
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for…"
            style={{ flex: 1, padding: 11, border: "1px solid #e4ddcb", borderRadius: 3 }}
          />
          <button className="content-btn" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
      </div>

      {error && <div className="form-error">{error}</div>}

      {results && (
        <div className="panel">
          {results.length === 0 && <p style={{ color: "#7a7466" }}>No matches. Add some cases first.</p>}
          {results.map((r) => (
            <div className="data-row" key={r.case_id}>
              <span>{r.title}</span>
              <span className="score-pill score-pill--low">{r.score.toFixed(2)} match</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
