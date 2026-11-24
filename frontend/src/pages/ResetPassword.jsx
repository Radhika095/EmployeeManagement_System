import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import AuthShell from "../components/AuthShell.jsx";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password: form.password });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(errorMessage(err, "Could not reset the password. Check your connection."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Set new password" subtitle="Enter your new password.">
      <form className="stack" onSubmit={submit}>
        {error && (
          <p className="alert alert-error">
            {error} {error.includes("expire") && <Link to="/forgot-password">Request a new link</Link>}
          </p>
        )}
        <label className="field">
          <span>New password</span>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoFocus />
        </label>
        <label className="field">
          <span>Confirm new password</span>
          <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
        </label>
        <button className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Change password"}</button>
        <p className="muted"><Link to="/login">Back to login</Link></p>
      </form>
    </AuthShell>
  );
}
