import { useState } from "react";
import { api } from "../api/client";

/*
  This is where the LLM features actually live: summarize (plain-language
  summary + key issues) and ask (Q&A grounded in this case's own text).
  Both show a small "mode" badge — "llm" or "fallback" — so it's always
  visible which one ran, rather than presenting a fallback extractive
  result as if it were a real model output.
*/
export default function CaseRow({ kase }) {
  const [related, setRelated] = useState(null);
  const [summary, setSummary] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(null); // "related" | "summary" | "ask" | null
  const [error, setError] = useState("");

  async function handleRelated() {
    setLoading("related");
    setError("");
    try {
      setRelated(await api.relatedCases(kase.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleSummarize() {
    setLoading("summary");
    setError("");
    try {
      setSummary(await api.summarizeCase(kase.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    setLoading("ask");
    setError("");
    try {
      setAnswer(await api.askCase(kase.id, question));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ borderBottom: "1px solid #ece5d3", padding: "16px 0" }}>
      <div className="data-row" style={{ borderBottom: "none", padding: 0 }}>
        <span>{kase.title}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ borderColor: "#c7bfa6", color: "#14181d" }}
            onClick={handleSummarize} disabled={loading === "summary"}>
            {loading === "summary" ? "Summarizing…" : "Summarize"}
          </button>
          <button className="btn" style={{ borderColor: "#c7bfa6", color: "#14181d" }}
            onClick={handleRelated} disabled={loading === "related"}>
            Related
          </button>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}

      {related && (
        <div style={{ marginTop: 10, paddingLeft: 12, fontSize: "0.88rem", color: "#5c574a" }}>
          {related.length === 0 ? "No linked cases yet." : related.map((r) => <div key={r.id}>↳ {r.title}</div>)}
        </div>
      )}

      {summary && (
        <div style={{ marginTop: 12, padding: 14, background: "#faf7ef", borderRadius: 4, border: "1px solid #ece5d3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ fontSize: "0.88rem" }}>Summary</strong>
            <ModeBadge mode={summary.mode} />
          </div>
          <p style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#3a3730" }}>{summary.summary}</p>
          {summary.key_issues?.length > 0 && (
            <>
              <strong style={{ fontSize: "0.82rem", color: "#5c574a" }}>Key issues</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: "0.88rem", color: "#3a3730" }}>
                {summary.key_issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleAsk} style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this case…"
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #e4ddcb", borderRadius: 4, fontSize: "0.88rem" }}
        />
        <button className="btn" style={{ borderColor: "#c7bfa6", color: "#14181d" }} type="submit" disabled={loading === "ask" || !question}>
          {loading === "ask" ? "Asking…" : "Ask"}
        </button>
      </form>

      {answer && (
        <div style={{ marginTop: 10, padding: 12, background: "#faf7ef", borderRadius: 4, border: "1px solid #ece5d3", fontSize: "0.9rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong style={{ fontSize: "0.82rem" }}>Answer</strong>
            <ModeBadge mode={answer.mode} />
          </div>
          {answer.answer}
        </div>
      )}
    </div>
  );
}

function ModeBadge({ mode }) {
  const isLlm = mode === "llm";
  return (
    <span style={{
      fontSize: "0.72rem",
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20,
      background: isLlm ? "#e6dff2" : "#f2ece0",
      color: isLlm ? "#5c4a8a" : "#8a6d3d",
    }}>
      {isLlm ? "LLM" : "fallback (no API key)"}
    </span>
  );
}
