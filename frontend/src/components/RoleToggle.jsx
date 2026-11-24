export default function RoleToggle({ value, onChange, label }) {
  const options = [
    { key: "employee", text: "Employee" },
    { key: "admin", text: "Admin" },
  ];
  return (
    <div className="field">
      <span>{label}</span>
      <div className="role-toggle" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={value === o.key}
            className={`btn ${value === o.key ? "btn-primary" : ""}`}
            onClick={() => onChange(o.key)}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}