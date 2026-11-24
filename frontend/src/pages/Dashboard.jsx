import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const time = (v) =>
  v ? new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const day = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");
const available = (b) =>
  Number(b.opening || 0) + Number(b.accrued || 0) + Number(b.adjusted || 0) - Number(b.used || 0);

// Ek card; `to` diya ho to click karne par us page par le jaata hai
function Card({ label, value, to, hint }) {
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small className="muted">{hint}</small>}
    </>
  );
  return to ? (
    <Link to={to} className="dash-card">{body}</Link>
  ) : (
    <div className="dash-card">{body}</div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [data, setData] = useState({});
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // allSettled: ek request fail ho to baaki dashboard phir bhi dikhe
      const calls = isAdmin
        ? [api.get("/attendance/roster"), api.get("/leaves/bootstrap"), api.get("/attendance/regularizations/pending")]
        : [api.get("/attendance/today"), api.get("/leaves/bootstrap")];
      const results = await Promise.allSettled(calls);
      if (!alive) return;
      const val = (i) => (results[i]?.status === "fulfilled" ? results[i].value.data : null);
      setFailed(results.some((r) => r.status === "rejected"));
      setData(
        isAdmin
          ? { roster: val(0), leaves: val(1), regs: val(2) }
          : { today: val(0), leaves: val(1) }
      );
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [isAdmin]);

  if (loading) return <main className="page"><p className="muted">Loading...</p></main>;

  /* ---------------- ADMIN ---------------- */
  if (isAdmin) {
    const rows = data.roster?.rows || [];
    const checkedIn = rows.filter((r) => r.checkIn).length;
    const absent = rows.filter((r) => r.status === "Absent").length;
    const pendingLeaves = (data.leaves?.requests || []).filter((r) => r.status === "Pending");
    const pendingRegs = data.regs?.length ?? 0;

    return (
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">Welcome, {user.name}. Today's overview.</p>
          </div>
          <Link to="/employees/new" className="btn btn-primary">Add employee</Link>
        </div>

            {failed && <p className="alert alert-error">Data is not loaded yet. Check your employee linked status.</p>}

        <div className="dash-grid">
          <Card label="Total employees" value={data.roster ? rows.length : "—"} to="/employees" />
          <Card label="Checked in today" value={data.roster ? checkedIn : "—"} to="/attendance" />
          <Card label="Absent today" value={data.roster ? absent : "—"} to="/attendance" />
          <Card label="Pending leave requests" value={data.leaves ? pendingLeaves.length : "—"} to="/leaves" />
          <Card label="Pending regularizations" value={data.regs ? pendingRegs : "—"} to="/attendance" />
        </div>

        <section className="attendance-section">
          <h2>Pending leave requests</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {pendingLeaves.slice(0, 5).map((r) => (
                  <tr key={r._id}>
                    <td>{r.employee?.name}</td>
                    <td>{r.leaveType?.code}</td>
                    <td>{day(r.fromDate)} – {day(r.toDate)}</td>
                    <td>{r.days}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
                {!pendingLeaves.length && <tr><td colSpan="5">No Pending Request.</td></tr>}
              </tbody>
            </table>
          </div>
          {pendingLeaves.length > 5 && <p className="muted small">Aur {pendingLeaves.length - 5} requests: <Link to="/leaves">Leave page</Link></p>}
        </section>
      </main>
    );
  }

  /* ---------------- EMPLOYEE ---------------- */
  const emp = data.leaves?.employee;
  const att = data.today?.attendance;
  const balances = data.leaves?.balances || [];
  const myRequests = data.leaves?.requests || [];
  const initials = String(user.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const statusText = !att ? "Not checked in yet" : att.checkOut ? "Checked out" : "Checked in";

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p className="muted">
            {[emp?.designation, emp?.department].filter(Boolean).join(" · ") || user.email}
          </p>
        </div>
        <Link to="/attendance" className="btn btn-primary">Go to Attendance</Link>
      </div>

      {failed && <p className="alert alert-error">Data is not loaded yet . Check your employee linked status </p>}

      <section className="attendance-section">
        <h2>Today's attendance</h2>
        <div className="dash-grid">
          <Card label="Status" value={statusText} hint={att?.status} />
          <Card label="Check-in" value={time(att?.checkIn)} />
          <Card label="Check-out" value={time(att?.checkOut)} />
        </div>
      </section>

      <section className="attendance-section">
        <h2>My profile</h2>
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div className="profile-main">
            <strong>{user.name}</strong>
            <span className="muted">{emp?.designation || "Employee"}</span>
          </div>
          <dl className="profile-details">
            <div><dt>Employee ID</dt><dd>{emp?.employeeId || data.today?.employee?.employeeId || "—"}</dd></div>
            <div><dt>Department</dt><dd>{emp?.department || "—"}</dd></div>
            <div><dt>Designation</dt><dd>{emp?.designation || "—"}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
          </dl>
        </div>
      </section>

      <section className="attendance-section">
        <h2>Leave balance</h2>
        <div className="leave-balance-grid">
          {balances.map((b) => (
            <article className="leave-balance-card" key={b._id}>
              <span>{b.leaveType?.code || "Leave"} · {b.leaveType?.name || ""}</span>
              <strong>{available(b).toFixed(1)} days</strong>
              <small>Used {Number(b.used || 0).toFixed(1)}</small>
            </article>
          ))}
          {!balances.length && <p className="muted">No Balance leave avilable now </p>}
        </div>
        <p><Link to="/leaves">Apply for a Leave </Link></p>
      </section>

      <section className="attendance-section">
        <h2>My recent leave requests</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {myRequests.slice(0, 5).map((r) => (
                <tr key={r._id}>
                  <td>{r.leaveType?.code}</td>
                  <td>{day(r.fromDate)} – {day(r.toDate)}</td>
                  <td>{r.days}</td>
                  <td><span className="chip">{r.status}</span></td>
                </tr>
              ))}
              {!myRequests.length && <tr><td colSpan="4">No Leave Request Available</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
