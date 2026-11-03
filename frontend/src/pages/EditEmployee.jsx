import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errorMessage } from "../api/axios.js";
import EmployeeForm from "../components/EmployeeForm.jsx";

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/employees/${id}`)
      .then(({ data }) =>
        setInitial({
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          designation: data.designation,
          salary: data.salary,
          joiningDate: data.joiningDate?.slice(0, 10) || "",
        })
      )
      .catch((err) => setLoadError(errorMessage(err, "Could not load this employee.")));
  }, [id]);

  const save = async (values) => {
    setError("");
    try {
      await api.put(`/employees/${id}`, values);
      navigate("/employees");
    } catch (err) {
      setError(errorMessage(err, "Could not save changes."));
    }
  };

  return (
    <main className="page narrow">
      <h1>Edit employee</h1>
      {loadError && <p className="alert alert-error">{loadError}</p>}
      {!initial && !loadError && <p className="muted">Loading...</p>}
      {initial && <EmployeeForm initial={initial} onSubmit={save} submitLabel="Save changes" error={error} />}
    </main>
  );
}
