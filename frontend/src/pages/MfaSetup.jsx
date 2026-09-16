import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { api } from "../api/client";

/*
  The QR code is rendered client-side from the provisioning URI using the
  `qrcode` package, entirely in the browser. Deliberately NOT using a
  public "QR code generator API" — that would mean sending the TOTP secret
  (embedded in the URI) to a third-party server, which defeats the point
  of a secret meant to stay between the user and this app.
*/
export default function MfaSetup() {
  const [uri, setUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.enrollMfa()
      .then((res) => {
        setUri(res.provisioning_uri);
        return QRCode.toDataURL(res.provisioning_uri, { margin: 1, color: { dark: "#0f1720", light: "#f4f1e9" } });
      })
      .then(setQrDataUrl)
      .catch((e) => setError(e.message));
  }, []);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    try {
      await api.verifyMfa(code);
      setDone(true);
      setTimeout(() => navigate("/app"), 1200);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1>Two-factor login</h1>
      <div className="panel" style={{ maxWidth: 440 }}>
        <p style={{ color: "#5c574a", marginTop: 0 }}>
          Scan with Google Authenticator, 1Password, or similar.
        </p>

        {error && <div className="form-error">{error}</div>}

        {qrDataUrl && (
          <img src={qrDataUrl} alt="TOTP QR code" style={{ width: "100%", borderRadius: 4, marginBottom: 20, border: "1px solid #e4ddcb" }} />
        )}

        {done ? (
          <div style={{ background: "#dfeee3", color: "var(--ok)", padding: "10px 14px", borderRadius: 4, fontSize: "0.9rem" }}>
            Two-factor login enabled. Redirecting…
          </div>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="field">
              <label htmlFor="verify" style={{ color: "#5c574a" }}>Enter the 6-digit code to confirm</label>
              <input id="verify" inputMode="numeric" required value={code}
                onChange={(e) => setCode(e.target.value)} placeholder="000000"
                style={{ width: "100%", padding: 11, border: "1px solid #e4ddcb", borderRadius: 4 }} />
            </div>
            <button className="content-btn" type="submit">Confirm</button>
          </form>
        )}

        <p style={{ marginTop: 18 }}>
          <a href="/app" onClick={(e) => { e.preventDefault(); navigate("/app"); }} style={{ color: "var(--brass-dim)" }}>
            Skip for now
          </a>
        </p>
      </div>
    </>
  );
}
