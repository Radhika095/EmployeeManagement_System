import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import EmployeeList from "./pages/EmployeeList.jsx";
import AddEmployee from "./pages/AddEmployee.jsx";
import EditEmployee from "./pages/EditEmployee.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/employees/new" element={<AddEmployee />} />
          <Route path="/employees/:id/edit" element={<EditEmployee />} />
        </Route>
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </>
  );
}
