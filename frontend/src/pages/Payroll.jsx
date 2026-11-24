import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
const rupees=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
const monthName=m=>new Date(2000,m-1,1).toLocaleString("en-IN",{month:"long"});
export default function Payroll(){
  const {user}=useAuth(),admin=user?.role==="admin";
  const now=new Date();
  const [data,setData]=useState({employees:[],structures:[],payslips:[]});
  const [month,setMonth]=useState(now.getMonth()+1),[year,setYear]=useState(now.getFullYear());
  const [employee,setEmployee]=useState("");
  const [form,setForm]=useState({basic:0,hra:0,allowances:0,otherDeductions:0,pfRate:0,esiRate:0,professionalTax:0,tds:0,bankName:"",accountHolder:"",accountNumber:"",ifsc:""});
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try{const r=await api.get("/payroll");setData(r.data);setError("");}catch(e){setError(errorMessage(e,"Could not load payroll data."));}},[]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{const s=data.structures.find(x=>String(x.employee?._id||x.employee)===String(employee));if(s)setForm({...form,...s,employee:undefined});else if(employee){const p=data.employees.find(x=>x._id===employee);setForm(f=>({...f,basic:Number(p?.salary||0),hra:0,allowances:0}));}},[employee]);
  const fields=[["basic","Basic salary"],["hra","HRA"],["allowances","Other allowances"],["otherDeductions","Other deductions"],["pfRate","PF (%)"],["esiRate","ESI (%)"],["professionalTax","Professional tax (₹)"],["tds","TDS (₹)"]];
  async function save(e){e.preventDefault();setBusy(true);setError("");setNotice("");try{await api.post("/payroll/structures",{...form,employee});setNotice("Salary structure saved.");await load();}catch(e){setError(errorMessage(e,"Could not save salary structure."));}finally{setBusy(false);}}
  async function generate(){setBusy(true);setError("");setNotice("");try{const r=await api.post("/payroll/generate",{month:Number(month),year:Number(year)});setNotice(r.data.message);await load();}catch(e){setError(errorMessage(e,"Could not generate payroll."));}finally{setBusy(false);}}
  async function downloadBank(){try{const r=await api.get(`/payroll/bank-advice?month=${month}&year=${year}`,{responseType:"blob"});const url=URL.createObjectURL(r.data);const a=document.createElement("a");a.href=url;a.download=`bank-advice-${year}-${String(month).padStart(2,"0")}.csv`;a.click();URL.revokeObjectURL(url);}catch(e){setError(errorMessage(e,"Could not download bank advice."));}}
  function printSlip(p){const w=window.open("","_blank","width=850,height=900");if(!w){setError("Allow pop-ups to print a payslip.");return;}const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));w.document.write(`<!doctype html><html><head><title>Payslip ${esc(p.employeeName)}</title><style>body{font:14px Arial;padding:36px;color:#17213a}h1{margin:0}small{color:#667}header{display:flex;justify-content:space-between;border-bottom:2px solid #17213a;padding-bottom:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:25px 0}.box{border:1px solid #ddd;padding:14px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.amount{text-align:right}.net{font-size:20px;font-weight:bold;text-align:right;margin-top:25px}@media print{button{display:none}}</style></head><body><header><div><h1>PAYSLIP</h1><small>${esc(monthName(p.month))} ${p.year}</small></div><strong>Headcount</strong></header><div class="grid"><div class="box"><b>${esc(p.employeeName)}</b><p>${esc(p.employeeId)} · ${esc(p.department)}</p><p>${esc(p.designation)}</p></div><div class="box"><b>Bank details</b><p>${esc(p.bankName)}</p><p>Account: ${esc(p.accountNumber)}</p><p>IFSC: ${esc(p.ifsc)}</p></div></div><table><tr><th>Earnings</th><th class="amount">Amount</th><th>Deductions</th><th class="amount">Amount</th></tr>${[["Basic","basic","PF","pf"],["HRA","hra","ESI","esi"],["Allowances","allowances","Professional tax","professionalTax"],["Gross","gross","TDS","tds"],["","","Other deductions","other"]].map(([a,b,c,d])=>`<tr><td>${a}</td><td class="amount">${a?Number(p.earnings?.[b]||0).toFixed(2):""}</td><td>${c}</td><td class="amount">${c?Number(p.deductions?.[d]||0).toFixed(2):""}</td></tr>`).join("")}</table><div class="net">Net pay: ₹${Number(p.netPay||0).toFixed(2)}</div><p><small>Generated electronically. Statutory amounts depend on the rates configured by your organization.</small></p><button onclick="window.print()">Print / Save as PDF</button></body></html>`);w.document.close();}
  return <main className="page payroll-page">
    <div className="page-head"><div><span className="eyebrow">COMPENSATION</span><h1>Payroll management</h1><p className="muted">Configure salary components, calculate monthly payroll and issue payslips.</p></div></div>
    {error&&<p className="alert alert-error">{error}</p>}{notice&&<p className="alert alert-success">{notice}</p>}
    {admin&&<section className="attendance-section"><div className="section-title"><div><h2>Salary structure</h2><p className="muted small">Set monthly earnings, deductions and bank details per employee.</p></div></div>
      <form className="payroll-form" onSubmit={save}>
        <label className="field payroll-wide"><span>Employee</span><select required value={employee} onChange={e=>setEmployee(e.target.value)}><option value="">Select employee</option>{data.employees.map(p=><option key={p._id} value={p._id}>{p.name} · {p.employeeId||p.email}</option>)}</select></label>
        {fields.map(([key,label])=><label className="field" key={key}><span>{label}</span><input type="number" min="0" step=".01" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
        <label className="field"><span>Bank name</span><input value={form.bankName} onChange={e=>setForm({...form,bankName:e.target.value})}/></label>
        <label className="field"><span>Account holder</span><input value={form.accountHolder} onChange={e=>setForm({...form,accountHolder:e.target.value})}/></label>
        <label className="field"><span>Account number</span><input value={form.accountNumber} onChange={e=>setForm({...form,accountNumber:e.target.value})}/></label>
        <label className="field"><span>IFSC</span><input value={form.ifsc} onChange={e=>setForm({...form,ifsc:e.target.value.toUpperCase()})}/></label>
        <div className="payroll-wide"><button className="btn btn-primary" disabled={busy||!employee}>Save salary structure</button></div>
      </form>
    </section>}
    <section className="attendance-section"><div className="section-title"><div><h2>{admin?"Generate monthly payroll":"My payslips"}</h2><p className="muted small">Select a payroll period to view or generate payslips.</p></div></div>
      <div className="payroll-period"><label className="field"><span>Month</span><select value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option value={i+1} key={i}>{monthName(i+1)}</option>)}</select></label><label className="field"><span>Year</span><input type="number" min="2000" max="2200" value={year} onChange={e=>setYear(e.target.value)}/></label>
      {admin&&<><button className="btn btn-primary" disabled={busy} onClick={generate}>Generate payslips</button><button className="btn" disabled={busy} onClick={downloadBank}>Download bank advice CSV</button></>}</div>
      <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Period</th><th>Gross pay</th><th>Deductions</th><th>Net pay</th><th>Action</th></tr></thead><tbody>
        {data.payslips.filter(p=>Number(p.month)===Number(month)&&Number(p.year)===Number(year)).map(p=><tr key={p._id}><td><strong>{p.employeeName}</strong><br/><small>{p.employeeId}</small></td><td>{monthName(p.month)} {p.year}</td><td>{rupees(p.earnings?.gross)}</td><td>{rupees(p.deductions?.total)}</td><td><strong>{rupees(p.netPay)}</strong></td><td><button className="btn btn-small" onClick={()=>printSlip(p)}>View / Print</button></td></tr>)}
        {!data.payslips.some(p=>Number(p.month)===Number(month)&&Number(p.year)===Number(year))&&<tr><td colSpan="6">No payslips generated for this period.</td></tr>}
      </tbody></table></div>
    </section>
    <p className="payroll-disclaimer">Payroll calculations use the PF and ESI percentages, professional tax and TDS amounts entered in each salary structure. Confirm current statutory applicability, thresholds, state-specific PT and tax rules with your payroll professional before processing actual salary payments.</p>
  </main>;
}
