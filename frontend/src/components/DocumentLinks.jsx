import { useState } from "react";
import api from "../api/axios.js";

const TYPES = [
  ["aadhaar", "Aadhaar"],
  ["pan", "PAN"],
  ["offerLetter", "Offer letter"],
];

// Uploaded documents ke "View" buttons. File login token ke saath fetch hoti hai,
// isliye seedha link kaam nahi karta.
export default function DocumentLinks({ employee, basePath }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const open = async (type) => {
    setBusy(type);
    setError("");
    try {
      const res = await api.get(`${basePath || `/employees/${employee._id}`}/documents/${type}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      // responseType "blob" mein server ka error bhi Blob aata hai, isliye use padh ke asli message dikhate hain
      let msg = "Document open nahi ho paya.";
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try { msg = JSON.parse(await data.text()).message || msg; } catch { /* ignore */ }
      } else if (err?.code === "ERR_NETWORK") {
        msg = "Backend se connect nahi ho paya. Backend chalu hai?";
      }
      setError(`${msg}${err?.response?.status ? ` (status ${err.response.status})` : ""}`);
    } finally {
      setBusy("");
    }
  };

  const uploaded = TYPES.filter(([key]) => employee.documents?.[key]);
  if (!uploaded.length) return <span className="muted small">No documents</span>;

  return (
    <div>
      {uploaded.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className="btn btn-small"
          disabled={busy === key}
          onClick={() => open(key)}
        >
          {busy === key ? "Opening..." : label}
        </button>
      ))}
      {error && <div className="muted small">{error}</div>}
    </div>
  );
}
