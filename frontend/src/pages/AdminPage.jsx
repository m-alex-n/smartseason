import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "../api";
import { loadAuth } from "../authStore";

const stages = ["PLANTED", "GROWING", "READY", "HARVESTED"];

export function AdminPage() {
  const qc = useQueryClient();
  const { user } = loadAuth();
  const [name, setName] = useState("");
  const [cropType, setCropType] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [currentStage, setCurrentStage] = useState("PLANTED");

  const fieldsQ = useQuery({
    queryKey: ["fields"],
    queryFn: async () => (await api.get("/fields")).data.fields,
  });

  const usersQ = useQuery({
    queryKey: ["users", "AGENT"],
    queryFn: async () => (await api.get("/admin/users?role=AGENT")).data.users,
    enabled: user?.role === "ADMIN",
  });

  const agents = usersQ.data || [];
  const fields = fieldsQ.data || [];

  const createField = useMutation({
    mutationFn: async () => {
      const res = await api.post("/fields", { name, cropType, plantingDate, currentStage });
      return res.data.field;
    },
    onSuccess: async () => {
      setName("");
      setCropType("");
      setPlantingDate("");
      setCurrentStage("PLANTED");
      await qc.invalidateQueries({ queryKey: ["fields"] });
    },
  });

  const assign = useMutation({
    mutationFn: async ({ fieldId, agentId }) => {
      await api.post(`/admin/fields/${fieldId}/assign`, { agentId });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["fields"] });
    },
  });

  const defaultPlantingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  if (user?.role !== "ADMIN") {
    return (
      <div className="card">
        <h1>Admin</h1>
        <div className="alert">You must be an ADMIN to access this page.</div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="cardHeader">
          <h1>Admin</h1>
          <p className="muted">Create fields and assign them to agents.</p>
        </div>

        <h2>Create field</h2>
        <div className="form gridForm">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. East Block" />
          </label>
          <label>
            Crop type
            <input value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="e.g. Maize" />
          </label>
          <label>
            Planting date
            <input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              placeholder={defaultPlantingDate}
            />
          </label>
          <label>
            Current stage
            <select value={currentStage} onChange={(e) => setCurrentStage(e.target.value)}>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="span2">
            <button
              className="btn btn-primary"
              disabled={createField.isPending}
              onClick={() => {
                if (!plantingDate) setPlantingDate(defaultPlantingDate);
                createField.mutate();
              }}
            >
              {createField.isPending ? "Creating…" : "Create field"}
            </button>
            {createField.isError ? <div className="alert">Failed to create field.</div> : null}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <h2>Assignments</h2>
          {usersQ.isLoading ? <span className="muted">Loading agents…</span> : null}
        </div>

        <div className="table">
          <div className="row rowHead">
            <div>Field</div>
            <div>Current assignments</div>
            <div>Assign agent</div>
          </div>
          {fields.map((f) => (
            <div key={f.id} className="row">
              <div className="strong">{f.name}</div>
              <div className="muted">
                {(f.assignments || []).map((a) => a.user.email).join(", ") || "—"}
              </div>
              <div>
                <select
                  onChange={(e) => {
                    const agentId = e.target.value;
                    if (!agentId) return;
                    assign.mutate({ fieldId: f.id, agentId });
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="">Select agent…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {assign.isError ? <div className="alert">Failed to assign agent.</div> : null}
        {fieldsQ.isError ? <div className="alert">Failed to load fields.</div> : null}
      </div>
    </div>
  );
}

