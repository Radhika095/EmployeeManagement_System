import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const fmt = d => d ? new Date(d).toLocaleDateString("en-IN") : "—";
export default function LeaveManagement() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  const [data, setData] = useState({ types: [], balances: [], holidays: [], requests: [] });
  const [form, setForm] = useState({ leaveType: "", fromDate: "", toDate: "", reason: "" });
  const [typeForm, setTypeForm] = useState({ code: "", name: "", annualQuota: 12, accrualPerMonth: 1, carryForward: false });
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", description: "" });
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const r = await api.get("/leaves/bootstrap"); setData(r.data); setError(""); if (!form.leaveType && r.data.types[0]) setForm(f => ({ ...f, leaveType: r.data.types[0]._id })); }
    catch (e) { setError(errorMessage(e, "Could not load leave information.")); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await api.post("/leaves/requests", form); setNotice("Leave request submitted for approval."); setForm(f => ({ ...f, fromDate: "", toDate: "", reason: "" })); await load(); }
    catch (e) { setError(errorMessage(e, "Could not submit leave request.")); } finally { setBusy(false); }
  }
  async function review(id, status) {
    setBusy(true); setError(""); setNotice("");
    try { await api.patch(`/leaves/requests/${id}/review`, { status }); setNotice(`Leave request ${status.toLowerCase()}.`); await load(); }
    catch (e) { setError(errorMessage(e, "Could not review leave request.")); } finally { setBusy(false); }
  }
  async function addType(e) {
    e.preventDefault(); setBusy(true);
    try { await api.post("/leaves/types", typeForm); setNotice("Leave type created."); setTypeForm({ code:"",name:"",annualQuota:12,accrualPerMonth:1,carryForward:false }); await load(); }
    catch (e) { setError(errorMessage(e, "Could not create leave type.")); } finally { setBusy(false); }
  }
  async function addHoliday(e) {
    e.preventDefault(); setBusy(true);
    try { await api.post("/leaves/holidays", holidayForm); setNotice("Holiday added."); setHolidayForm({name:"",date:"",description:""}); await load(); }
    catch (e) { setError(errorMessage(e, "Could not add holiday.")); } finally { setBusy(false); }
  }
  const available = b => Number(b.opening||0)+Number(b.accrued||0)+Number(b.adjusted||0)-Number(b.used||0);
  return <main className="page">
    <div className="page-head"><div><h1>Leave management</h1><p className="muted">Leave types, balances, accrual, requests, approvals and holidays</p></div></div>
    {error && <p className="alert alert-error">{error}</p>}{notice && <p className="alert alert-success">{notice}</p>}
    <section className="attendance-section"><h2>My leave balances</h2><div className="leave-balance-grid">
      {data.balances.filter(b => !admin || b.employee).map(b => <article className="leave-balance-card" key={b._id}><span>{b.leaveType?.code || "Leave"} · {b.leaveType?.name || ""}</span><strong>{available(b).toFixed(1)} days</strong><small>Accrued {Number(b.accrued||0).toFixed(1)} · Used {Number(b.used||0).toFixed(1)}</small>{admin && <small>{b.employee?.name || ""}</small>}</article>)}
      {!data.balances.length && <p className="muted small">Balances appear after your employee profile is linked to your login email.</p>}
    </div></section>
    {!admin && <section className="attendance-section"><h2>Apply for leave</h2><form className="attendance-form" onSubmit={submit}>
      <label className="field"><span>Leave type</span><select required value={form.leaveType} onChange={e=>setForm({...form,leaveType:e.target.value})}><option value="">Select leave type</option>{data.types.map(t=><option key={t._id} value={t._id}>{t.code} — {t.name}</option>)}</select></label>
      <label className="field"><span>From date</span><input type="date" required value={form.fromDate} onChange={e=>setForm({...form,fromDate:e.target.value})}/></label>
      <label className="field"><span>To date</span><input type="date" required min={form.fromDate} value={form.toDate} onChange={e=>setForm({...form,toDate:e.target.value})}/></label>
      <label className="field full"><span>Reason</span><textarea rows="3" required maxLength="1000" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
      <button className="btn btn-primary" disabled={busy}>Submit leave request</button>
    </form></section>}
    <section className="attendance-section"><h2>{admin ? "All leave requests" : "My leave requests"}</h2><div className="table-wrap"><table><thead><tr>{admin&&<th>Employee</th>}<th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th>{admin&&<th>Action</th>}</tr></thead><tbody>
      {data.requests.map(r=><tr key={r._id}>{admin&&<td>{r.employee?.name}</td>}<td>{r.leaveType?.code}</td><td>{fmt(r.fromDate)} – {fmt(r.toDate)}</td><td>{r.days}</td><td>{r.reason}</td><td><span className="chip">{r.status}</span></td>{admin&&<td>{r.status==="Pending"&&<div className="review-actions"><button className="btn btn-small btn-primary" disabled={busy} onClick={()=>review(r._id,"Approved")}>Approve</button><button className="btn btn-small btn-danger" disabled={busy} onClick={()=>review(r._id,"Rejected")}>Reject</button></div>}</td>}</tr>)}
      {!data.requests.length&&<tr><td colSpan={admin?7:5}>No leave requests yet.</td></tr>}
    </tbody></table></div></section>
    <section className="attendance-section"><h2>Holiday calendar</h2><div className="table-wrap"><table><thead><tr><th>Holiday</th><th>Date</th><th>Description</th></tr></thead><tbody>{data.holidays.map(h=><tr key={h._id}><td>{h.name}</td><td>{fmt(h.date)}</td><td>{h.description||"—"}</td></tr>)}{!data.holidays.length&&<tr><td colSpan="3">No holidays configured.</td></tr>}</tbody></table></div></section>
    {admin&&<div className="attendance-columns">
      <section className="attendance-section"><h2>Configure leave type & accrual</h2><form className="attendance-form" onSubmit={addType}>
        <label className="field"><span>Code (CL/SL/PL)</span><input required maxLength="5" value={typeForm.code} onChange={e=>setTypeForm({...typeForm,code:e.target.value.toUpperCase()})}/></label>
        <label className="field"><span>Name</span><input required value={typeForm.name} onChange={e=>setTypeForm({...typeForm,name:e.target.value})}/></label>
        <label className="field"><span>Annual quota</span><input type="number" min="0" step=".5" value={typeForm.annualQuota} onChange={e=>setTypeForm({...typeForm,annualQuota:e.target.value})}/></label>
        <label className="field"><span>Accrual per month</span><input type="number" min="0" step=".25" value={typeForm.accrualPerMonth} onChange={e=>setTypeForm({...typeForm,accrualPerMonth:e.target.value})}/></label>
        <label className="field full"><input type="checkbox" checked={typeForm.carryForward} onChange={e=>setTypeForm({...typeForm,carryForward:e.target.checked})}/> Carry forward enabled</label>
        <button className="btn btn-primary" disabled={busy}>Add leave type</button>
      </form></section>
      <section className="attendance-section"><h2>Add holiday</h2><form className="attendance-form" onSubmit={addHoliday}>
        <label className="field full"><span>Holiday name</span><input required value={holidayForm.name} onChange={e=>setHolidayForm({...holidayForm,name:e.target.value})}/></label>
        <label className="field"><span>Date</span><input type="date" required value={holidayForm.date} onChange={e=>setHolidayForm({...holidayForm,date:e.target.value})}/></label>
        <label className="field"><span>Description</span><input value={holidayForm.description} onChange={e=>setHolidayForm({...holidayForm,description:e.target.value})}/></label>
        <button className="btn btn-primary" disabled={busy}>Add holiday</button>
      </form></section>
    </div>}
  </main>;
}
