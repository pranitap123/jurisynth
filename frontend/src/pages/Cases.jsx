import { useEffect, useState } from "react";
import { api } from "../api/client";
import CaseRow from "./CaseRow";

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.listCases().then(setCases).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.createCase(title, bodyText);
      setTitle("");
      setBodyText("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <h1>Cases</h1>
      {error && <div className="form-error">{error}</div>}

      <div className="panel">
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="title">Case title</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="body">Case text</label>
            <textarea id="body" required rows={4} value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              style={{ width: "100%", padding: 11, fontFamily: "inherit", border: "1px solid #e4ddcb", borderRadius: 3 }} />
          </div>
          <button className="content-btn" type="submit" disabled={creating}>
            {creating ? "Indexing…" : "Add case"}
          </button>
        </form>
      </div>

      <div className="panel">
        {cases.length === 0 && <p style={{ color: "#7a7466" }}>No cases yet — add one above.</p>}
        {cases.map((c) => <CaseRow key={c.id} kase={c} />)}
      </div>
    </>
  );
}
