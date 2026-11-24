import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import DocumentLinks from "../components/DocumentLinks.jsx";

const MAX = 5 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOCS = [["aadhaar", "Aadhaar card", "🪪"], ["pan", "PAN card", "💳"], ["offerLetter", "Offer letter", "📄"]];
const d10 = (v) => v?.slice?.(0, 10) || "";

const toForm = (e) => ({
  name: e.name || "",
  phone: e.phone || "",
  personalInfo: { dateOfBirth: d10(e.personalInfo?.dateOfBirth), gender: e.personalInfo?.gender || "", maritalStatus: e.personalInfo?.maritalStatus || "" },
  contact: { alternatePhone: "", address: "", city: "", state: "", postalCode: "", country: "India", ...e.contact },
  emergencyContact: { name: "", relationship: "", phone: "", ...e.emergencyContact },
  employmentHistory: [{ company: "", designation: "", experience: "", ...e.employmentHistory?.[0], startDate: d10(e.employmentHistory?.[0]?.startDate), endDate: d10(e.employmentHistory?.[0]?.endDate) }],
});

const Section = ({ title, children }) => <section className="form-section full"><h2>{title}</h2><div className="form-grid-inner">{children}</div></section>;
const Read = ({ label, value }) => <label className="field"><span>{label}</span><input value={value || "—"} readOnly disabled /></label>;

export default function Profile() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState({});
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/profile")
      .then(({ data }) => { setEmp(data); setForm(toForm(data)); })
      .catch((err) => setLoadError(errorMessage(err, "Could not load your profile.")));
  }, []);

  const set = (key, value) => { setSaved(false); setForm((f) => ({ ...f, [key]: value })); };
  const nest = (section, key, value) => { setSaved(false); setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } })); };
  const history = (key, value) => { setSaved(false); setForm((f) => ({ ...f, employmentHistory: [{ ...f.employmentHistory[0], [key]: value }] })); };
  const text = (label, value, onChange, type = "text", required = false) =>
    <label className="field"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label>;

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSaved(false);
    const data = new FormData();
    data.append("name", form.name);
    data.append("phone", form.phone);
    for (const k of ["personalInfo", "contact", "emergencyContact", "employmentHistory"]) data.append(k, JSON.stringify(form[k]));
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      if (file.size > MAX) return setError(`${file.name} exceeds the 5 MB limit.`);
      if (!TYPES.includes(file.type)) return setError("Only PDF, JPG and PNG files are allowed.");
      data.append(key, file);
    }
    setSaving(true);
    try {
      const { data: updated } = await api.put("/profile", data);
      updateUser({ name: updated.name });
      navigate("/dashboard");
    } catch (err) {
      setError(errorMessage(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>My profile</h1>
      {loadError && <p className="alert alert-error">{loadError}</p>}
      {!emp && !loadError && <p className="muted">Loading...</p>}
      {emp && form && (
        <form className="form-grid" onSubmit={submit}>
          {error && <p className="alert alert-error full">{error}</p>}
          {saved && <p className="alert alert-success full">Profile updated.</p>}

          <Section title="Employee details (set by HR)">
            <Read label="Employee ID" value={emp.employeeId} />
            <Read label="Work email" value={emp.email} />
            <Read label="Department" value={emp.department} />
            <Read label="Designation" value={emp.designation} />
            <Read label="Joining date" value={d10(emp.joiningDate)} />
            <Read label="Reporting manager" value={emp.reportingManager ? `${emp.reportingManager.name} — ${emp.reportingManager.designation}` : ""} />
          </Section>

          <Section title="Personal information">
            {text("Full name", form.name, (v) => set("name", v), "text", true)}
            {text("Mobile number", form.phone, (v) => set("phone", v), "tel", true)}
            {text("Date of birth", form.personalInfo.dateOfBirth, (v) => nest("personalInfo", "dateOfBirth", v), "date")}
            <label className="field"><span>Gender</span><select value={form.personalInfo.gender} onChange={(e) => nest("personalInfo", "gender", e.target.value)}><option value="">Select</option>{["Female", "Male", "Other", "Prefer not to say"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="field"><span>Marital status</span><select value={form.personalInfo.maritalStatus} onChange={(e) => nest("personalInfo", "maritalStatus", e.target.value)}><option value="">Select</option>{["Single", "Married", "Other"].map((x) => <option key={x}>{x}</option>)}</select></label>
          </Section>

          <Section title="Contact information">
            {[["alternatePhone", "Alternate phone", "tel"], ["address", "Address"], ["city", "City"], ["state", "State"], ["postalCode", "PIN code"], ["country", "Country"]].map(([k, l, t]) =>
              <div key={k} style={{ display: "contents" }}>{text(l, form.contact[k] || "", (v) => nest("contact", k, v), t)}</div>)}
          </Section>

          <Section title="Emergency contact">
            {text("Contact person", form.emergencyContact.name || "", (v) => nest("emergencyContact", "name", v))}
            {text("Relationship", form.emergencyContact.relationship || "", (v) => nest("emergencyContact", "relationship", v))}
            {text("Emergency phone", form.emergencyContact.phone || "", (v) => nest("emergencyContact", "phone", v), "tel")}
          </Section>

          <Section title="Previous employment history">
            {[["company", "Previous company"], ["designation", "Previous designation"], ["startDate", "Start date"], ["endDate", "End date"], ["experience", "Experience (e.g. 2 years)"]].map(([k, l]) =>
              <div key={k} style={{ display: "contents" }}>{text(l, form.employmentHistory[0][k] || "", (v) => history(k, v), k.includes("Date") ? "date" : "text")}</div>)}
          </Section>

          <Section title="Documents (PDF, JPG or PNG; max 5 MB each)">
            <div className="document-upload-grid full">
              {DOCS.map(([key, label, icon]) => (
                <label className="document-upload-card" key={key}>
                  <input className="document-hidden-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFiles((f) => ({ ...f, [key]: e.target.files?.[0] || null }))} />
                  <span className="document-icon" aria-hidden="true">{icon}</span>
                  <strong>{label}</strong>
                  <span className="document-file-name">{files[key]?.name || emp.documents?.[key]?.originalName || "Choose file"}</span>
                  <span className="document-file-action">{files[key] ? "Selected" : "Browse files"}</span>
                </label>
              ))}
            </div>
            <div className="full"><p className="muted small">Already uploaded:</p><DocumentLinks employee={emp} basePath="/profile" /></div>
          </Section>

          <div className="form-actions full"><button className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
        </form>
      )}
    </main>
  );
}
