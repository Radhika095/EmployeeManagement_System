import { useCallback, useEffect, useMemo, useState } from "react";
import api, { errorMessage } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

// Helper functions
const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

const mins = (value) => {
  const total = Number(value) || 0;
  return `${Math.floor(total / 60)}h ${total % 60}m`;
};

const today = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

// CSV helper: quotes the value and blocks Excel formula injection (=, +, -, @)
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// Format shift time
const formatShiftTime = (value) => {
  if (!value) return "";

  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHour = hours % 12 || 12;

  return `${formattedHour}:${String(minutes).padStart(2, "0")} ${period}`;
};

// Get employee location
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(
        new Error("This browser does not support location access.")
      );
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? "Please allow location permission to record attendance."
              : "Could not get your location. Please try again."
          )
        ),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [pendingRequests, setPendingRequests] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [records, setRecords] = useState([]);
  const [roster, setRoster] = useState({ date: "", rows: [] });
  const [search, setSearch] = useState("");

  // Search: naam, email, employee ID, department, shift ya status se
  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster.rows;
    return roster.rows.filter((r) =>
      [
        r.employee.name,
        r.employee.email,
        r.employee.employeeId,
        r.employee.department,
        r.shift?.name,
        r.status,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [roster.rows, search]);
  const [requests, setRequests] = useState([]);

  const [selectedShift, setSelectedShift] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [form, setForm] = useState({
    dateKey: today(),
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: "",
  });

  const [shiftForm, setShiftForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
  });

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Remove duplicate shifts
  // Same name + start time + end time = one shift
  const uniqueShifts = useMemo(() => {
    const unique = new Map();

    shifts.forEach((shift) => {
      const key = [
        shift.name?.trim().toLowerCase(),
        shift.startTime,
        shift.endTime,
      ].join("-");

      if (!unique.has(key)) {
        unique.set(key, shift);
      }
    });

    return Array.from(unique.values());
  }, [shifts]);

  // Load attendance data
  const load = useCallback(async () => {
    try {
      const [
        todayRes,
        shiftRes,
        recordRes,
        requestRes,
        pendingRes,
        rosterRes,
      ] = await Promise.all([
        api.get("/attendance/today"),
        api.get("/attendance/shifts"),
        api.get("/attendance/records", {
          params: dateFilter ? { date: dateFilter } : {},
        }),
        api.get("/attendance/regularizations"),
        isAdmin
          ? api.get("/attendance/regularizations/pending")
          : Promise.resolve({ data: [] }),
        isAdmin
          ? api.get("/attendance/roster", {
              params: dateFilter ? { date: dateFilter } : {},
            })
          : Promise.resolve({ data: null }),
      ]);

      setEmployee(todayRes.data.employee);
      setTodayRecord(todayRes.data.attendance);

      setShifts(shiftRes.data || []);
      setRecords(recordRes.data || []);
      setRequests(requestRes.data || []);
      setPendingRequests(pendingRes.data || []);
      if (rosterRes.data) setRoster(rosterRes.data);

      setError("");
    } catch (err) {
      setError(
        errorMessage(err, "Could not load attendance information.")
      );
    }
  }, [dateFilter, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep selected shift valid after loading unique shifts
  useEffect(() => {
    if (!uniqueShifts.length) {
      setSelectedShift("");
      return;
    }

    setSelectedShift((previous) => {
      const exists = uniqueShifts.some(
        (shift) => shift._id === previous
      );

      return exists ? previous : uniqueShifts[0]._id;
    });
  }, [uniqueShifts]);

  // Check-in / Check-out
  // Attendance list ko CSV mein download karo (Excel mein seedha khulti hai).
  // Search laga ho to sirf dikhne wali rows download hoti hain.
  const downloadCsv = () => {
    const header = [
      "Date", "Employee ID", "Name", "Email", "Department",
      "Shift", "Check-in", "Check-out", "Overtime", "Status",
    ];
    const lines = filteredRoster.map((r) => [
      roster.date,
      r.employee.employeeId || "",
      r.employee.name,
      r.employee.email || "",
      r.employee.department || "",
      r.shift?.name || "",
      r.checkIn ? time(r.checkIn) : "",
      r.checkOut ? time(r.checkOut) : "",
      mins(r.overtimeMinutes),
      r.status,
    ]);
    // \uFEFF = BOM, taaki Excel mein Hindi/special characters sahi dikhein
    const csv = "\uFEFF" + [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${roster.date || today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const punch = async (kind) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const location = await getLocation();

      const body = {
        location,
        ...(kind === "check-in"
          ? { shiftId: selectedShift }
          : {}),
      };

      await api.post(`/attendance/${kind}`, body);

      setNotice(
        kind === "check-in"
          ? "Check-in recorded successfully."
          : "Check-out recorded successfully."
      );

      await load();
    } catch (err) {
      const message = err.message || "";

      setError(
        message.startsWith("Please allow") ||
          message.startsWith("Could not get") ||
          message.startsWith("This browser")
          ? message
          : errorMessage(err, "Attendance operation failed.")
      );
    } finally {
      setBusy(false);
    }
  };

  // Submit regularization
  const submitRegularization = async (e) => {
    e.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.post("/attendance/regularizations", {
        ...form,
        requestedCheckIn: form.requestedCheckIn
          ? new Date(
              `${form.dateKey}T${form.requestedCheckIn}`
            ).toISOString()
          : null,
        requestedCheckOut: form.requestedCheckOut
          ? new Date(
              `${form.dateKey}T${form.requestedCheckOut}`
            ).toISOString()
          : null,
      });

      setForm({
        dateKey: today(),
        requestedCheckIn: "",
        requestedCheckOut: "",
        reason: "",
      });

      setNotice("Regularization request submitted.");
      await load();
    } catch (err) {
      setError(
        errorMessage(err, "Could not submit request.")
      );
    } finally {
      setBusy(false);
    }
  };

  // Admin review
  const reviewRequest = async (id, status) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.patch(
        `/attendance/regularizations/${id}/review`,
        { status }
      );

      setNotice(`Request ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(
        errorMessage(err, "Could not review request.")
      );
    } finally {
      setBusy(false);
    }
  };

  // Create shift
  const createShift = async (e) => {
    e.preventDefault();

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.post("/attendance/shifts", {
        ...shiftForm,
        breakMinutes: Number(shiftForm.breakMinutes),
      });

      setShiftForm({
        name: "",
        startTime: "09:00",
        endTime: "18:00",
        breakMinutes: 60,
      });

      setNotice("Shift created successfully.");
      await load();
    } catch (err) {
      setError(
        errorMessage(err, "Could not create shift.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">

      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Attendance</h1>
          <p className="muted">
            Check-in/out, shifts, overtime and attendance corrections
          </p>
        </div>

        <span className="chip">
          {isAdmin ? "Admin" : employee?.employeeId || employee?.name || "Employee"}
        </span>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-success">{notice}</p>}

      {/* Today's Attendance (sirf employee) */}
      {!isAdmin && (
      <section className="attendance-panel">
        <div>
          <h2>Today's Attendance</h2>
          <p className="muted">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="attendance-stats">
          <div>
            <span>Check-in</span>
            <strong>{time(todayRecord?.checkIn)}</strong>
          </div>

          <div>
            <span>Check-out</span>
            <strong>{time(todayRecord?.checkOut)}</strong>
          </div>

          <div>
            <span>Overtime</span>
            <strong>{mins(todayRecord?.overtimeMinutes)}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              {todayRecord?.status || "Not checked in"}
            </strong>
          </div>
        </div>

        <div className="attendance-actions">

          {/* Only ONE Shift Dropdown */}
          <label className="field shift-picker">
            <span>Shift</span>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              disabled={
                !uniqueShifts.length ||
                busy ||
                !!todayRecord?.checkIn
              }
            >
              <option value="">Select Shift</option>

              {uniqueShifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (
                  {formatShiftTime(s.startTime)} -{" "}
                  {formatShiftTime(s.endTime)})
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn btn-primary"
            disabled={
              busy ||
              !selectedShift ||
              !!todayRecord?.checkIn
            }
            onClick={() => punch("check-in")}
          >
            {busy ? "Please wait..." : "Check In"}
          </button>

          <button
            className="btn"
            disabled={
              busy ||
              !todayRecord?.checkIn ||
              !!todayRecord?.checkOut
            }
            onClick={() => punch("check-out")}
          >
            Check Out
          </button>
        </div>

        <p className="muted small attendance-help">
          Location access is used to verify attendance.
          Office geo-fence restrictions are checked by the server
          when configured.
        </p>
      </section>
      )}

      {/* Attendance List: sirf admin ko, saare employees ki attendance */}
      {isAdmin && (
      <section className="attendance-section">
        <div className="section-title">
          <div>
            <h2>Attendance List</h2>
            <p className="muted small">
              All employees. Anyone who has not checked in shows as Absent.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="Search name, email, department, status"
              aria-label="Search attendance list"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              type="date"
              aria-label="Attendance date"
              value={dateFilter || roster.date || ""}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadCsv}
              disabled={!filteredRoster.length}
            >
              Download CSV ({filteredRoster.length})
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Overtime</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredRoster.map((r) => (
                <tr key={r.employee._id}>
                  <td>
                    <strong>{r.employee.name}</strong>
                    <div className="muted small">
                      {r.employee.employeeId || r.employee.email}
                    </div>
                  </td>
                  <td>{r.employee.department || "—"}</td>
                  <td>{r.shift?.name || "—"}</td>
                  <td>{time(r.checkIn)}</td>
                  <td>{time(r.checkOut)}</td>
                  <td>{mins(r.overtimeMinutes)}</td>
                  <td><span className="chip">{r.status}</span></td>
                </tr>
              ))}

              {!filteredRoster.length && (
                <tr>
                  <td colSpan="7">
                    {search ? "Is search se koi employee nahi mila." : "No employees added yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Attendance Records */}
      <section className="attendance-section">
        <div className="section-title">
          <div>
            <h2>Attendance Records</h2>
            <p className="muted small">
              {isAdmin
                ? "Latest 500 records across employees"
                : "Your attendance history"}
            </p>
          </div>

          <input
            type="date"
            aria-label="Filter attendance date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Shift</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Overtime</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.employee?.name || "—"}</strong>
                    <div className="muted small">
                      {r.employee?.employeeId || ""}
                    </div>
                  </td>

                  <td>{r.dateKey}</td>
                  <td>{r.shift?.name || "—"}</td>
                  <td>{time(r.checkIn)}</td>
                  <td>{time(r.checkOut)}</td>
                  <td>{mins(r.overtimeMinutes)}</td>

                  <td>
                    <span className="chip">{r.status}</span>
                  </td>
                </tr>
              ))}

              {!records.length && (
                <tr>
                  <td colSpan="7">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Admin Approvals */}
      {isAdmin && (
        <section className="attendance-section">
          <h2>Pending Regularization Approvals</h2>

          <p className="muted small">
            Admin review queue.
          </p>

          {pendingRequests.map((r) => (
            <article
              className="request-item admin-request"
              key={r._id}
            >
              <div>
                <strong>
                  {r.employee?.name || "Employee"}
                </strong>

                <div className="muted small">
                  {r.employee?.employeeId || ""} · {r.dateKey}
                </div>

                <p className="muted small">{r.reason}</p>

                <p className="small">
                  Requested: In {time(r.requestedCheckIn)} ·
                  Out {time(r.requestedCheckOut)}
                </p>
              </div>

              <div className="review-actions">
                <button
                  className="btn btn-small btn-primary"
                  disabled={busy}
                  onClick={() =>
                    reviewRequest(r._id, "Approved")
                  }
                >
                  Approve
                </button>

                <button
                  className="btn btn-small btn-danger"
                  disabled={busy}
                  onClick={() =>
                    reviewRequest(r._id, "Rejected")
                  }
                >
                  Reject
                </button>
              </div>
            </article>
          ))}

          {!pendingRequests.length && (
            <p className="muted small">
              No pending requests.
            </p>
          )}
        </section>
      )}

      <div className="attendance-columns">

        {/* Regularization Request */}
        <section className="attendance-section">
          <h2>Regularization Request</h2>

          <p className="muted small">
            Request a correction if you missed a punch
            or recorded an incorrect time.
          </p>

          <form
            className="attendance-form"
            onSubmit={submitRegularization}
          >
            <label className="field">
              <span>Date</span>

              <input
                type="date"
                required
                max={today()}
                value={form.dateKey}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dateKey: e.target.value,
                  })
                }
              />
            </label>

            <label className="field">
              <span>Correct Check-in</span>

              <input
                type="time"
                value={form.requestedCheckIn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    requestedCheckIn: e.target.value,
                  })
                }
              />
            </label>

            <label className="field">
              <span>Correct Check-out</span>

              <input
                type="time"
                value={form.requestedCheckOut}
                onChange={(e) =>
                  setForm({
                    ...form,
                    requestedCheckOut: e.target.value,
                  })
                }
              />
            </label>

            <label className="field full">
              <span>Reason</span>

              <textarea
                required
                rows="3"
                maxLength="1000"
                value={form.reason}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reason: e.target.value,
                  })
                }
                placeholder="Explain why attendance needs correction"
              />
            </label>

            <button
              className="btn btn-primary"
              disabled={busy}
            >
              Submit Request
            </button>
          </form>

          <h3 className="subheading">My Requests</h3>

          <div className="request-list">
            {requests.map((r) => (
              <article
                className="request-item"
                key={r._id}
              >
                <strong>{date(r.dateKey)}</strong>
                <span className="chip">{r.status}</span>
                <p className="muted small">{r.reason}</p>

                {r.reviewNote && (
                  <p className="small">
                    Review: {r.reviewNote}
                  </p>
                )}
              </article>
            ))}

            {!requests.length && (
              <p className="muted small">
                No requests submitted.
              </p>
            )}
          </div>
        </section>

        {/* Shift Setup */}
        <section className="attendance-section">
          <h2>Shift Setup</h2>

          <p className="muted small">
            {isAdmin
              ? "Create shift templates available in the check-in selector."
              : "Available shift templates. Contact an admin to add or change shifts."}
          </p>

          {isAdmin && (
            <form
              className="attendance-form"
              onSubmit={createShift}
            >
              <label className="field full">
                <span>Shift Name</span>

                <input
                  required
                  value={shiftForm.name}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Morning shift"
                />
              </label>

              <label className="field">
                <span>Start Time</span>

                <input
                  type="time"
                  required
                  value={shiftForm.startTime}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      startTime: e.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>End Time</span>

                <input
                  type="time"
                  required
                  value={shiftForm.endTime}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      endTime: e.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Break (minutes)</span>

                <input
                  type="number"
                  min="0"
                  max="600"
                  value={shiftForm.breakMinutes}
                  onChange={(e) =>
                    setShiftForm({
                      ...shiftForm,
                      breakMinutes: e.target.value,
                    })
                  }
                />
              </label>

              <button
                className="btn btn-primary"
                disabled={busy}
              >
                Create Shift
              </button>
            </form>
          )}

          <h3 className="subheading">Available Shifts</h3>

          {uniqueShifts.map((s) => (
            <div className="shift-item" key={s._id}>
              <strong>{s.name}</strong>

              <span>
                {formatShiftTime(s.startTime)} –{" "}
                {formatShiftTime(s.endTime)}
              </span>

              <span className="muted small">
                Break: {s.breakMinutes} min
              </span>
            </div>
          ))}

          {!uniqueShifts.length && (
            <p className="muted small">
              No shifts available.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
    