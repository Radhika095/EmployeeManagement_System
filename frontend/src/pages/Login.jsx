import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import RoleToggle from "../components/RoleToggle.jsx";
import { homeFor } from "../utils/roles.js";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("employee");
  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { ...form, role });
      signIn(data);
      navigate(location.state?.from?.pathname || homeFor(data.user), { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not sign in. Check your connection."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Manage your team's records in one place.">
      <form className="stack" onSubmit={submit}>
        <RoleToggle value={role} onChange={setRole} label="Sign in as" />
        {error && <p className="alert alert-error">{error}</p>}
        {location.state?.registered && !error && (
  <p className="alert alert-success">Account created. Sign in to continue.</p>
)}
        {location.state?.passwordReset && !error && (
          <p className="alert alert-success">Password changed. Sign in with your new password.</p>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        <p className="muted"><Link to="/forgot-password">Forgot password?</Link></p>
        <button className="btn btn-primary" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
