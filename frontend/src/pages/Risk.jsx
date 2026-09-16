import { useState } from "react";
import { api } from "../api/client";

const initial = { case_length: 4000, num_prior_citations: 5, num_parties: 2, statute_severity: 0.5 };

export default function Risk() {
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.scoreRisk({
        case_length: Number(form.case_length),
        num_prior_citations: Number(form.num_prior_citations),
        num_parties: Number(form.num_parties),
        statute_severity: Number(form.statute_severity),
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Risk score</h1>
      <p style={{ color: "#5c574a", maxWidth: 560, marginTop: -18, marginBottom: 26 }}>
        Trained on a synthetic feature set to validate the pipeline — treat
        results as a starting signal, not a real-world risk assessment.
      </p>

      <div className="panel">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Case length (characters)</label>
            <input type="number" min="0" value={form.case_length}
              onChange={(e) => update("case_length", e.target.value)}
              style={{ width: "100%", padding: 11, border: "1px solid #e4ddcb", borderRadius: 3 }} />
          </div>
          <div className="field">
            <label>Prior citations</label>
            <input type="number" min="0" value={form.num_prior_citations}
              onChange={(e) => update("num_prior_citations", e.target.value)}
              style={{ width: "100%", padding: 11, border: "1px solid #e4ddcb", borderRadius: 3 }} />
          </div>
          <div className="field">
            <label>Number of parties</label>
            <input type="number" min="1" value={form.num_parties}
              onChange={(e) => update("num_parties", e.target.value)}
              style={{ width: "100%", padding: 11, border: "1px solid #e4ddcb", borderRadius: 3 }} />
          </div>
          <div className="field">
            <label>Statute severity (0–1)</label>
            <input type="number" min="0" max="1" step="0.05" value={form.statute_severity}
              onChange={(e) => update("statute_severity", e.target.value)}
              style={{ width: "100%", padding: 11, border: "1px solid #e4ddcb", borderRadius: 3 }} />
          </div>
          <button className="content-btn" type="submit" disabled={loading}>
            {loading ? "Scoring…" : "Score case"}
          </button>
        </form>
      </div>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Predicted risk</span>
          <span className={`score-pill ${result.risk_score > 0.5 ? "score-pill--high" : "score-pill--low"}`}>
            {result.risk_score.toFixed(2)} · {result.model_version}
          </span>
        </div>
      )}
    </>
  );
}
