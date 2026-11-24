import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import DocumentLinks from "./DocumentLinks.jsx";

const empty = {
  employeeId: "", name: "", email: "", phone: "", personalInfo: { dateOfBirth: "", gender: "", maritalStatus: "" },
  contact: { alternatePhone: "", address: "", city: "", state: "", postalCode: "", country: "India" },
  emergencyContact: { name: "", relationship: "", phone: "" }, employmentHistory: [], department: "", designation: "", reportingManager: "", salary: "", joiningDate: "",
};
const departments = ["Engineering", "Design", "Product", "Sales", "Marketing", "HR", "Finance", "Operations", "Support"];
const Section = ({ title, children }) => <section className="form-section full"><h2>{title}</h2><div className="form-grid-inner">{children}</div></section>;

export default function EmployeeForm({ initial, onSubmit, submitLabel, error }) {
  const [form, setForm] = useState(() => ({ ...empty, ...initial, personalInfo: { ...empty.personalInfo, ...initial?.personalInfo, dateOfBirth: initial?.personalInfo?.dateOfBirth?.slice?.(0, 10) || "" }, contact: { ...empty.contact, ...initial?.contact }, emergencyContact: { ...empty.emergencyContact, ...initial?.emergencyContact }, employmentHistory: (initial?.employmentHistory || []).map(h => ({ ...h, startDate: h.startDate?.slice?.(0,10) || "", endDate: h.endDate?.slice?.(0,10) || "" })) }));
  const [files, setFiles] = useState({});
  const [managers, setManagers] = useState([]);
  useEffect(() => { api.get("/employees").then(({ data }) => setManagers(data.filter(e => e._id !== initial?._id))).catch(() => {}); }, [initial?._id]);
  const [saving, setSaving] = useState(false);
  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const nested = (section, key, value) => setForm(f => ({ ...f, [section]: { ...f[section], [key]: value } }));
  const historyChange = (key, value) => setForm(f => ({ ...f, employmentHistory: [{ ...(f.employmentHistory[0] || {}), [key]: value }] }));
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = new FormData();
    for (const [key, value] of Object.entries(form)) {
      // Send explicit null when no manager is selected so edits can clear an old manager.
      const normalized = key === "email" ? String(value || "").trim().toLowerCase()
        : key === "reportingManager" && !String(value || "").trim() ? "null" : value;
      data.append(key, ["personalInfo", "contact", "emergencyContact", "employmentHistory"].includes(key) ? JSON.stringify(value) : normalized);
    }
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      if (file.size > 5 * 1024 * 1024) { alert(`${file.name} exceeds the 5 MB limit.`); setSaving(false); return; }
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { alert("Only PDF, JPG and PNG files are allowed."); setSaving(false); return; }
      data.append(key, file);
    }
    try { await onSubmit(data); } finally { setSaving(false); }
  };
  const field = (label, name, value, type = "text", required = false) => <label className="field" key={name}><span>{label}</span><input name={name} type={type} value={value ?? ""} onChange={change} required={required} /></label>;
  const nestedField = (section, key, label, type = "text") => <label className="field" key={`${section}-${key}`}><span>{label}</span><input type={type} value={form[section]?.[key] || ""} onChange={e => nested(section, key, e.target.value)} /></label>;
  return <form className="form-grid" onSubmit={submit}>
    {error && <p className="alert alert-error full">{error}</p>}
    <Section title="Personal information">
      {field("Employee ID", "employeeId", form.employeeId)}{field("Full name", "name", form.name, "text", true)}{field("Work email", "email", form.email, "email", true)}{field("Mobile number", "phone", form.phone, "tel", true)}
      {nestedField("personalInfo", "dateOfBirth", "Date of birth", "date")}
      <label className="field"><span>Gender</span><select value={form.personalInfo.gender} onChange={e => nested("personalInfo", "gender", e.target.value)}><option value="">Select</option>{["Female", "Male", "Other", "Prefer not to say"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="field"><span>Marital status</span><select value={form.personalInfo.maritalStatus} onChange={e => nested("personalInfo", "maritalStatus", e.target.value)}><option value="">Select</option>{["Single", "Married", "Other"].map(x => <option key={x}>{x}</option>)}</select></label>
    </Section>
    <Section title="Contact information">{nestedField("contact", "alternatePhone", "Alternate phone", "tel")}{nestedField("contact", "address", "Address")}{nestedField("contact", "city", "City")}{nestedField("contact", "state", "State")}{nestedField("contact", "postalCode", "PIN code")}{nestedField("contact", "country", "Country")}</Section>
    <Section title="Emergency contact">{nestedField("emergencyContact", "name", "Contact person")}{nestedField("emergencyContact", "relationship", "Relationship")}{nestedField("emergencyContact", "phone", "Emergency phone", "tel")}</Section>
    <Section title="Employment details">
      <label className="field"><span>Department</span><input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} list="dept-list" required /><datalist id="dept-list">{departments.map(d => <option key={d} value={d} />)}</datalist></label>
      <label className="field"><span>Designation</span><input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} required /></label>
      {field("Monthly salary (INR)", "salary", form.salary, "number", true)}{field("Joining date", "joiningDate", form.joiningDate, "date", true)}
      <label className="field"><span>Reporting manager (employee ID)</span><select value={form.reportingManager || ""} onChange={e => setForm(f => ({ ...f, reportingManager: e.target.value }))}><option value="">No manager</option>{managers.map(m => <option key={m._id} value={m._id}>{m.name} — {m.designation}</option>)}</select></label>
    </Section>
    <Section title="Previous employment history">
      {([ ["company", "Previous company"], ["designation", "Previous designation"], ["startDate", "Start date"], ["endDate", "End date"], ["experience", "Experience (e.g. 2 years)"] ]).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input type={key.includes("Date") ? "date" : "text"} value={form.employmentHistory[0]?.[key] || ""} onChange={e => historyChange(key, e.target.value)} /></label>)}
    </Section>
    <Section title="Documents (PDF, JPG or PNG; max 5 MB each)">
      <div className="document-upload-grid full">
        {[
          ["aadhaar", "Aadhaar card", "🪪", "Identity proof"],
          ["pan", "PAN card", "💳", "Tax document"],
          ["offerLetter", "Offer letter", "📄", "Employment document"]
        ].map(([key, label, icon, hint]) => <label className="document-upload-card" key={key}>
          <input className="document-hidden-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e => setFiles(f => ({ ...f, [key]: e.target.files?.[0] || null }))}/>
          <span className="document-icon" aria-hidden="true">{icon}</span>
          <strong>{label}</strong><small>{hint}</small>
          <span className="document-file-name">{files[key]?.name || initial?.documents?.[key]?.originalName || "Choose file"}</span>
          <span className="document-file-action">{files[key] ? "Selected" : "Browse files"}</span>
        </label>)}
      </div>
      {initial?._id && <div className="full"><p className="muted small">Already uploaded documents:</p><DocumentLinks employee={initial} /></div>}
    </Section>
    <div className="form-actions full"><button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : submitLabel}</button><Link to="/employees" className="btn btn-ghost">Cancel</Link></div>
  </form>;
}
