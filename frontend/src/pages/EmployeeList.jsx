import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/employees", { params: { search } });
        setEmployees(data);
        setError("");
      } catch (err) {
        setError(errorMessage(err, "Could not load employees."));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const remove = async (emp) => {
    if (!window.confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${emp._id}`);
      setEmployees((list) => list.filter((e) => e._id !== emp._id));
    } catch (err) {
      setError(errorMessage(err, "Could not delete this employee."));
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Employees</h1>
          <p className="muted">{loading ? "Loading..." : `${employees.length} ${employees.length === 1 ? "person" : "people"}${search ? " match your search" : " on the team"}`}</p>
        </div>
        <Link to="/employees/new" className="btn btn-primary">Add employee</Link>
      </div>

      <input
        className="search"
        type="search"
        placeholder="Search by name, email, department or designation"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search employees"
      />

      {error && <p className="alert alert-error">{error}</p>}

      {!loading && employees.length === 0 && !error ? (
        <div className="empty">
          <h2>{search ? "No one matches that search" : "No employees yet"}</h2>
          <p className="muted">{search ? "Try a different name or department." : "Add your first employee to start the list."}</p>
          {!search && <Link to="/employees/new" className="btn btn-primary">Add employee</Link>}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Phone</th>
                <th className="num">Salary</th>
                <th>Joined</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className="person">{emp.name}</div>
                    <div className="muted small">{emp.email}</div>
                  </td>
                  <td><span className="chip">{emp.department}</span></td>
                  <td>{emp.designation}</td>
                  <td>{emp.phone}</td>
                  <td className="num">{money.format(emp.salary)}</td>
                  <td>{formatDate(emp.joiningDate)}</td>
                  <td className="row-actions">
                    <Link to={`/employees/${emp._id}/edit`} className="btn btn-small">Edit</Link>
                    <button className="btn btn-small btn-danger" onClick={() => remove(emp)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
