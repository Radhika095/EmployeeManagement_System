import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import EmployeeForm from "../components/EmployeeForm.jsx";

export default function AddEmployee() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const save = async (values) => {
    setError("");
    try {
      await api.post("/employees", values);
      navigate("/employees");
    } catch (err) {
      setError(errorMessage(err, "Could not add the employee."));
    }
  };

  return (
    <main className="page narrow">
      <h1>Add employee</h1>
      <p className="muted">Enter the details exactly as they should appear in the list.</p>
      <EmployeeForm onSubmit={save} submitLabel="Add employee" error={error} />
    </main>
  );
}
