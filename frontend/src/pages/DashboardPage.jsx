import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { loadAuth } from "../authStore";

function statusLabel(s) {
  if (s === "AT_RISK") return "At Risk";
  if (s === "COMPLETED") return "Completed";
  return "Active";
}

function statusClass(s) {
  if (s === "AT_RISK") return "pill pill-risk";
  if (s === "COMPLETED") return "pill pill-done";
  return "pill pill-active";
}

export function DashboardPage() {
  const { user } = loadAuth();
  const fieldsQ = useQuery({
    queryKey: ["fields"],
    queryFn: async () => (await api.get("/fields")).data.fields,
  });

  const fields = fieldsQ.data || [];
  const counts = fields.reduce(
    (acc, f) => {
      acc.total += 1;
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  return (
    <div className="stack">
      <div className="heroCard">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {user?.role === "ADMIN"
              ? "All fields across all agents."
              : "Fields assigned to you."}
          </p>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="metricVal">{counts.total}</div>
            <div className="metricLabel">Total fields</div>
          </div>
          <div className="metric">
            <div className="metricVal">{counts.ACTIVE || 0}</div>
            <div className="metricLabel">Active</div>
          </div>
          <div className="metric">
            <div className="metricVal">{counts.AT_RISK || 0}</div>
            <div className="metricLabel">At risk</div>
          </div>
          <div className="metric">
            <div className="metricVal">{counts.COMPLETED || 0}</div>
            <div className="metricLabel">Completed</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <h2>Fields</h2>
          {fieldsQ.isLoading ? <span className="muted">Loading…</span> : null}
        </div>
        {fieldsQ.isError ? (
          <div className="alert">Failed to load fields.</div>
        ) : null}
        <div className="table">
          <div className="row rowHead">
            <div>Name</div>
            <div>Crop</div>
            <div>Stage</div>
            <div>Status</div>
            <div>Assigned</div>
          </div>
          {fields.map((f) => (
            <Link key={f.id} to={`/fields/${f.id}`} className="row rowLink">
              <div className="strong">{f.name}</div>
              <div>{f.cropType}</div>
              <div>{f.currentStage}</div>
              <div>
                <span className={statusClass(f.status)}>{statusLabel(f.status)}</span>
              </div>
              <div className="muted">
                {(f.assignments || []).map((a) => a.user.email).join(", ") || "—"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

