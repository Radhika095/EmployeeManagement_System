import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <Link to={user ? "/employees" : "/login"} className="brand">
        Headcount
      </Link>
      {user && (
        <nav className="nav-right">
          <Link to="/employees" className="nav-link">Employees</Link>
          <span className="nav-user">{user.name}</span>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
        </nav>
      )}
    </header>
  );
}
