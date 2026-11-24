import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import EmployeeList from "./pages/EmployeeList.jsx";
import AddEmployee from "./pages/AddEmployee.jsx";
import EditEmployee from "./pages/EditEmployee.jsx";
import Attendance from "./pages/Attendance.jsx";
import Lifecycle from "./pages/Lifecycle.jsx";
import LeaveManagement from "./pages/LeaveManagement.jsx";
import Payroll from "./pages/Payroll.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        {/* Admin and employee */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leaves" element={<LeaveManagement />} />
  
          <Route path="/payroll" element={<Payroll />} />
        </Route>
        {/* Employee only */}
        <Route element={<ProtectedRoute roles={["employee"]} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        {/* Admin only */}
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/lifecycle" element={<Lifecycle />} />
          <Route path="/employees/new" element={<AddEmployee />} />
          <Route path="/employees/:id/edit" element={<EditEmployee />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
