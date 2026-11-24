import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { homeFor } from "../utils/roles.js";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to={user ? homeFor(user) : "/login"} className="brand">
        Headcount
      </Link>
      {user && (
        <nav className="nav-right">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          {user.role === "admin" && <Link to="/employees" className="nav-link">Employees</Link>}
          <Link to="/attendance" className="nav-link">Attendance</Link>
          <Link to="/leaves" className="nav-link">Leave</Link>
          <Link to="/payroll" className="nav-link">Payroll</Link>
          {user.role === "admin" && <Link to="/lifecycle" className="nav-link">Onboarding / Offboarding</Link>}
          {user.role !== "admin" && <Link to="/profile" className="nav-link">My Profile</Link>}
          <span className="nav-user">{user.name} {user.employeeId && <span className="chip">{user.employeeId}</span>} <span className="chip">{user.role === "admin" ? "Admin" : "Employee"}</span></span>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
        </nav>
      )}
    </header>
  );
}
