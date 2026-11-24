import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import AuthShell from "../components/AuthShell.jsx";
import RoleToggle from "../components/RoleToggle.jsx";
import { homeFor } from "../utils/roles.js";

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("employee");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "", adminCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (role === "employee" && !/^[6-9]\d{9}$/.test(form.phone)) return setError("Enter a valid 10-digit Indian mobile number.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
  const { name, email, password, adminCode, phone } = form;
  await api.post("/auth/register", { name, email, password, role, phone: role === "employee" ? phone : undefined, adminCode: role === "admin" ? adminCode : undefined });
  navigate("/login", { replace: true, state: { registered: true, email } });
} catch (err) {
  setError(errorMessage(err, "Could not create the account. Check your connection."));
} finally {
  setLoading(false);
}
  };

  return (
    <AuthShell title="Create your account" subtitle="Set up access for managing employee records.">
      <form className="stack" onSubmit={submit}>
        <RoleToggle value={role} onChange={setRole} label="Register as" />
        {error && <p className="alert alert-error">{error}</p>}
        <label className="field">
          <span>Full name</span>
          <input value={form.name} onChange={set("name")} required autoFocus />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set("email")} required />
        </label>
        {role === "employee" && (
          <label className="field">
            <span>Mobile number</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Password</span>
          <input type="password" value={form.password} onChange={set("password")} required />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input type="password" value={form.confirm} onChange={set("confirm")} required />
        </label>
        {role === "admin" && (
          <label className="field">
            <span>Admin access code</span>
            <input type="password" value={form.adminCode} onChange={set("adminCode")} required />
          </label>
        )}
        <button className="btn btn-primary" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
