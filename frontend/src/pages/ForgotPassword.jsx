import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import AuthShell from "../components/AuthShell.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDebug("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
      setDebug(data.debug || "");
    } catch (err) {
      setError(errorMessage(err, "Could not send the request. Check your connection."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="Enter your registered email and we'll send you a reset link.">
      <form className="stack" onSubmit={submit}>
        {error && <p className="alert alert-error">{error}</p>}
        {message && <p className="alert alert-success">{message}</p>}
        {debug && <p className="alert alert-error"><strong>Debug:</strong> {debug}</p>}
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <button className="btn btn-primary" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
        <p className="muted"><Link to="/login">Back to login</Link></p>
      </form>
    </AuthShell>
  );
}
