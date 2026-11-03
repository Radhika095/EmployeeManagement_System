import { useState } from "react";
import { Link } from "react-router-dom";

const empty = {
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  salary: "",
  joiningDate: "",
};

const departments = ["Engineering", "Design", "Product", "Sales", "Marketing", "HR", "Finance", "Operations", "Support"];

export default function EmployeeForm({ initial, onSubmit, submitLabel, error }) {
  const [form, setForm] = useState({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...form, salary: Number(form.salary) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      {error && <p className="alert alert-error full">{error}</p>}

      <label className="field">
        <span>Full name</span>
        <input name="name" value={form.name} onChange={change} required />
      </label>

      <label className="field">
        <span>Work email</span>
        <input type="email" name="email" value={form.email} onChange={change} required />
      </label>

      <label className="field">
        <span>Phone</span>
        <input name="phone" value={form.phone} onChange={change} placeholder="+91 98765 43210" required />
      </label>

      <label className="field">
        <span>Department</span>
        <input name="department" list="dept-list" value={form.department} onChange={change} required />
        <datalist id="dept-list">
          {departments.map((d) => <option key={d} value={d} />)}
        </datalist>
      </label>

      <label className="field">
        <span>Designation</span>
        <input name="designation" value={form.designation} onChange={change} required />
      </label>

      <label className="field">
        <span>Monthly salary (INR)</span>
        <input type="number" min="0" name="salary" value={form.salary} onChange={change} required />
      </label>

      <label className="field">
        <span>Joining date</span>
        <input type="date" name="joiningDate" value={form.joiningDate} onChange={change} required />
      </label>

      <div className="form-actions full">
        <button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : submitLabel}</button>
        <Link to="/employees" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
