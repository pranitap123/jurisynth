import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Hero3D from "../components/Hero3D";
import Nav from "../components/Nav";
import TiltCard from "../components/TiltCard";

export default function Landing() {
  return (
    <>
      <Nav />

      <div className="bg-mesh">
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1>Read the case, and everything that argues with it.</h1>
          <p className="lede">
            Jurisynth indexes case text for semantic search, models citation
            relationships as a graph, and scores filings for risk — one
            authenticated workspace per firm, isolated at every layer.
          </p>
          <div className="hero__actions">
            <Link to="/signup" className="btn btn--solid">Start a workspace</Link>
            <a href="#how-it-works" className="btn">See how it works</a>
          </div>
        </motion.div>

        <div className="hero__canvas-wrap">
          <Hero3D />
        </div>
      </section>
      </div>

      <section className="feature">
        <div className="feature__copy">
          <div className="feature__eyebrow">Semantic search</div>
          <h2>Find the case, not just the keyword.</h2>
          <p>
            Filings are embedded and indexed with FAISS, so a search for
            "landlord failed to disclose lead paint" surfaces cases about
            non-disclosure and habitability even when they never use those
            exact words.
          </p>
        </div>
        <TiltCard className="feature__mock">
          <div className="data-row"><span>Query</span><span>"failure to disclose habitability defect"</span></div>
          <div className="data-row"><span>Doe v. Harlan Properties</span><span className="score-pill score-pill--low">0.91 match</span></div>
          <div className="data-row"><span>Reyes v. Blackstone Realty</span><span className="score-pill score-pill--low">0.87 match</span></div>
        </TiltCard>
      </section>

      <section className="feature">
        <div className="feature__copy">
          <div className="feature__eyebrow">Risk scoring</div>
          <h2>A second opinion, before you file.</h2>
          <p>
            Case length, prior citations, party count, and statute severity
            feed a trained model that flags filings likely to be contested —
            a starting signal, not a verdict.
          </p>
        </div>
        <TiltCard className="feature__mock">
          <div className="data-row"><span>Case #4471</span><span className="score-pill score-pill--high">0.78 risk</span></div>
          <div className="data-row"><span>Case #4472</span><span className="score-pill score-pill--low">0.22 risk</span></div>
          <div className="data-row"><span>Case #4473</span><span className="score-pill score-pill--low">0.35 risk</span></div>
        </TiltCard>
      </section>

      <section className="feature">
        <div className="feature__copy">
          <div className="feature__eyebrow">Citation graph</div>
          <h2>See what a ruling actually rests on.</h2>
          <p>
            Every case is a node in a Neo4j graph; every citation an edge.
            Traverse two or three hops out to see the precedent a ruling
            depends on — and what would fall with it.
          </p>
        </div>
        <TiltCard className="feature__mock">
          <div className="data-row"><span>Doe v. Harlan</span><span>cites 4 cases</span></div>
          <div className="data-row"><span>↳ within 2 hops</span><span>11 related cases</span></div>
        </TiltCard>
      </section>

      <section className="feature">
        <div className="feature__copy">
          <div className="feature__eyebrow">Summarization &amp; Q&amp;A</div>
          <h2>Ask the filing, don't just read it.</h2>
          <p>
            Every case gets a plain-language summary and extracted key
            issues, grounded only in its own text — and you can ask it
            direct questions instead of re-reading the whole filing.
          </p>
        </div>
        <TiltCard className="feature__mock">
          <div style={{ marginBottom: 10, fontSize: "0.82rem", color: "var(--mist)" }}>Key issues</div>
          <div className="data-row"><span>Failure to disclose habitability defect</span></div>
          <div className="data-row"><span>Breach of implied warranty</span></div>
          <div className="data-row"><span>Q: "Who are the parties?"</span><span style={{ color: "var(--brass)" }}>answered ↴</span></div>
        </TiltCard>
      </section>

      <section className="sequence" id="how-it-works">
        <h2 className="sequence__title">From filing to finding, in four steps.</h2>
        <ol className="sequence__list">
          <li className="sequence__step" data-step="1">
            <h3>Ingest a case</h3>
            <p>Add a filing's text; it's embedded and indexed for search immediately.</p>
          </li>
          <li className="sequence__step" data-step="2">
            <h3>Search semantically</h3>
            <p>Query in plain language — matches are ranked by meaning, not keyword overlap.</p>
          </li>
          <li className="sequence__step" data-step="3">
            <h3>Score the risk</h3>
            <p>Run a filing's features through the risk model for an early signal.</p>
          </li>
          <li className="sequence__step" data-step="4">
            <h3>Traverse precedent</h3>
            <p>Follow citation edges outward to see what a ruling depends on.</p>
          </li>
          <li className="sequence__step" data-step="5">
            <h3>Summarize and ask</h3>
            <p>Get a plain-language summary and key issues, or ask a direct question about the filing.</p>
          </li>
        </ol>
      </section>
    </>
  );
}
