import { useEffect, useState, useCallback } from "react";
import api from "../api/axios.js";

const money = n => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(Number(n)||0);
const dateText = d => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";

export default function Lifecycle() {
  const [type, setType] = useState("onboarding");
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cases, people] = await Promise.all([api.get(`/lifecycle?type=${type}`), api.get("/employees")]);
      setRows(Array.isArray(cases.data) ? cases.data : []);
      setEmployees(Array.isArray(people.data) ? people.data : people.data.employees || []);
      setError("");
    } catch (e) { setError(e.response?.data?.message || "Unable to load lifecycle records. Check your login and backend."); }
  }, [type]);
  useEffect(() => { load(); }, [load]);

  async function createCase(e) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      await api.post("/lifecycle", { employee, type, effectiveDate: date });
      setMessage(`${type === "onboarding" ? "Onboarding" : "Offboarding"} case created successfully.`);
      setEmployee(""); setDate(""); await load();
    } catch (e) { setError(e.response?.data?.message || "Could not create the lifecycle case."); }
    finally { setBusy(false); }
  }
  async function patchCase(row, patch) {
    setBusy(true); setError(""); setMessage("");
    try { await api.patch(`/lifecycle/${row._id}`, patch); setMessage("Lifecycle record updated."); await load(); }
    catch (e) { setError(e.response?.data?.message || "Could not update this record."); }
    finally { setBusy(false); }
  }
  async function toggleItem(row, index) {
    const checklist = row.checklist.map((item, i) => i === index
      ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date() : null } : item);
    await patchCase(row, { checklist });
  }
  async function toggleClearance(row, item) {
    const exitClearance = row.exitClearance.map(c => c._id === item._id
      ? { ...c, cleared: !c.cleared, clearedAt: !c.cleared ? new Date() : null } : c);
    await patchCase(row, { exitClearance });
  }
  async function saveSettlement(row, e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const settlement = {
      salaryDue:Number(f.get("salaryDue")||0), leaveEncashment:Number(f.get("leaveEncashment")||0),
      bonus:Number(f.get("bonus")||0), gratuity:Number(f.get("gratuity")||0),
      deductions:Number(f.get("deductions")||0), status:f.get("status"), notes:f.get("notes")||""
    };
    await patchCase(row, { settlement });
  }
  const completed = row => (row.checklist||[]).filter(x=>x.completed).length;
  const total = row => (row.checklist||[]).length;
  const net = s => Number(s?.salaryDue||0)+Number(s?.leaveEncashment||0)+Number(s?.bonus||0)+Number(s?.gratuity||0)-Number(s?.deductions||0);

  return <main className="page lifecycle-page">
    <div className="page-head lifecycle-heading">
      <div><span className="eyebrow">PEOPLE OPERATIONS</span><h1>Onboarding &amp; Offboarding</h1>
        <p className="muted">A single workspace for joining, employee assets, exit clearance and final settlement.</p></div>
      <div className="lifecycle-summary"><strong>{rows.length}</strong><span>{type === "onboarding" ? "Joining cases" : "Exit cases"}</span></div>
    </div>
    <div className="lifecycle-tabs" role="tablist" aria-label="Lifecycle type">
      <button type="button" className={type==="onboarding"?"active":""} onClick={()=>{setType("onboarding");setMessage("");}}> <span>＋</span> Onboarding</button>
      <button type="button" className={type==="offboarding"?"active":""} onClick={()=>{setType("offboarding");setMessage("");}}> <span>↗</span> Offboarding</button>
    </div>
    {error && <p className="alert alert-error lifecycle-alert">{error}</p>}
    {message && <p className="alert alert-success lifecycle-alert">{message}</p>}
    <section className="lifecycle-create">
      <div><span className="eyebrow">NEW WORKFLOW</span><h2>Create {type} case</h2>
        <p className="muted">{type==="onboarding"?"Start a joining plan and track each new-hire task.":"Start an exit plan and coordinate clearance and settlement."}</p></div>
      <form onSubmit={createCase} className="lifecycle-create-form">
        <label className="field"><span>Employee</span><select required value={employee} onChange={e=>setEmployee(e.target.value)}>
          <option value="">Select employee</option>{employees.map(p=><option key={p._id} value={p._id}>{p.name || p.fullName || p.employeeId || p._id} {p.employeeId ? `(${p.employeeId})` : ""}</option>)}
        </select></label>
        <label className="field"><span>{type==="onboarding"?"Joining date":"Last working date"}</span><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
        <button className="btn btn-primary" type="submit" disabled={busy || !employees.length}>{busy?"Saving…":"Create case"}</button>
      </form>
      {!employees.length && <p className="muted small lifecycle-hint">Add an employee in Employee Master before creating a lifecycle case.</p>}
    </section>
    <div className="lifecycle-list-heading"><div><h2>{type==="onboarding"?"Joining checklist":"Exit management"}</h2><p className="muted">Track progress and update tasks as work is completed.</p></div><span className="chip">{rows.length} {rows.length===1?"case":"cases"}</span></div>
    {!rows.length ? <div className="lifecycle-empty"><div className="lifecycle-empty-icon">{type==="onboarding"?"✦":"↗"}</div><h3>No {type} cases yet</h3><p>Create a case above to start tracking {type==="onboarding"?"joining tasks":"exit clearance"}.</p></div> :
      <div className="lifecycle-cases">{rows.map(row=>{
        const progress=total(row)?Math.round(completed(row)/total(row)*100):0;
        return <article className="lifecycle-case" key={row._id}>
          <div className="lifecycle-case-top">
            <div><span className="eyebrow">{type==="onboarding"?"NEW JOINER":"EXIT PROCESS"}</span>
              <h3>{row.employee?.name || row.employee?.fullName || row.employee?.employeeId || "Employee"}</h3>
              <p className="muted">{row.employee?.department || "Department not set"} · {row.employee?.designation || "Designation not set"} · {type==="onboarding"?"Joining":"Last working"} date: {dateText(row.effectiveDate)}</p></div>
            <span className={`status-pill ${row.status==="completed"?"done":""}`}>{String(row.status||"in_progress").replace("_"," ")}</span>
          </div>
          <div className="lifecycle-progress-row"><span>Checklist progress</span><strong>{completed(row)} / {total(row)} tasks · {progress}%</strong></div>
          <div className="lifecycle-progress"><span style={{width:`${progress}%`}}/></div>
          <div className="lifecycle-checklist">{(row.checklist||[]).map((item,i)=><label className={`lifecycle-task ${item.completed?"task-done":""}`} key={item._id||i}>
            <input type="checkbox" checked={!!item.completed} disabled={busy} onChange={()=>toggleItem(row,i)}/><span>{item.title}</span>
            {item.completed && <small>Completed</small>}
          </label>)}</div>
          {type==="onboarding" && <div className="lifecycle-subsection"><h4>Document collection</h4><p className="muted small">Collect and verify the employee documents in Employee Master. Checklist items above track completion.</p></div>}
          {type==="offboarding" && <>
            <div className="lifecycle-subsection"><h4>Exit clearance</h4><div className="clearance-grid">{(row.exitClearance||[]).map(c=><label className="clearance-item" key={c._id||c.department}><input type="checkbox" checked={!!c.cleared} disabled={busy} onChange={()=>toggleClearance(row,c)}/><span>{c.department}</span><small>{c.cleared?"Cleared":"Pending"}</small></label>)}</div></div>
            <div className="lifecycle-subsection"><h4>Full &amp; final settlement</h4><form className="settlement-form" onSubmit={e=>saveSettlement(row,e)}>
              {["salaryDue","leaveEncashment","bonus","gratuity","deductions"].map((k)=><label className="field" key={k}><span>{({salaryDue:"Salary due",leaveEncashment:"Leave encashment",bonus:"Bonus",gratuity:"Gratuity",deductions:"Deductions"})[k]} (₹)</span><input name={k} type="number" min="0" step=".01" defaultValue={row.settlement?.[k]||0}/></label>)}
              <label className="field"><span>Settlement status</span><select name="status" defaultValue={row.settlement?.status||"not_started"}><option value="not_started">Not started</option><option value="calculated">Calculated</option><option value="approved">Approved</option><option value="paid">Paid</option></select></label>
              <label className="field settlement-notes"><span>Notes</span><input name="notes" defaultValue={row.settlement?.notes||""}/></label>
              <div className="settlement-total"><span>Net settlement estimate</span><strong>{money(net(row.settlement))}</strong></div>
              <button className="btn btn-primary" disabled={busy}>Save settlement</button>
            </form></div>
          </>}
          <div className="lifecycle-case-footer"><button className="btn btn-ghost btn-small" disabled={busy} onClick={()=>patchCase(row,{status:row.status==="completed"?"in_progress":"completed"})}>{row.status==="completed"?"Reopen case":"Mark case complete"}</button></div>
        </article>;
      })}</div>}
  </main>;
}
