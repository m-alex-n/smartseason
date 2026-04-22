import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";
import { loadAuth } from "../authStore";

const stages = ["PLANTED", "GROWING", "READY", "HARVESTED"];

export function FieldDetailPage() {
  const { fieldId } = useParams();
  const qc = useQueryClient();
  const { user } = loadAuth();

  const fieldQ = useQuery({
    queryKey: ["field", fieldId],
    queryFn: async () => (await api.get(`/fields/${fieldId}`)).data.field,
  });

  const [stage, setStage] = useState("GROWING");
  const [notes, setNotes] = useState("");

  const addUpdate = useMutation({
    mutationFn: async () => {
      await api.post(`/fields/${fieldId}/updates`, { stage, notes: notes || undefined });
    },
    onSuccess: async () => {
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["field", fieldId] });
      await qc.invalidateQueries({ queryKey: ["fields"] });
    },
  });

  if (fieldQ.isLoading) return <div className="card">Loading…</div>;
  if (fieldQ.isError) return <div className="card"><div className="alert">Failed to load field.</div></div>;

  const field = fieldQ.data;

  return (
    <div className="stack">
      <div className="card">
        <div className="cardHeader">
          <div>
            <h1>{field.name}</h1>
            <p className="muted">
              {field.cropType} • Planted {new Date(field.plantingDate).toLocaleDateString()}
            </p>
          </div>
          <div className="rightInline">
            <span className="pill pill-neutral">{field.currentStage}</span>
            <span className="pill pill-neutral">{field.status}</span>
          </div>
        </div>

        <div className="grid2">
          <div>
            <h2>Assignments</h2>
            <div className="muted">
              {(field.assignments || []).map((a) => a.user.email).join(", ") || "No assigned agents."}
            </div>
          </div>

          <div>
            <h2>Add update</h2>
            <div className="form compact">
              <label>
                Stage
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  {stages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations…" />
              </label>
              <button className="btn btn-primary" disabled={addUpdate.isPending}>
                {addUpdate.isPending
                  ? "Saving…"
                  : `Save update as ${user?.role === "ADMIN" ? "Admin" : "Agent"}`}
              </button>
              {addUpdate.isError ? <div className="alert">Failed to save update.</div> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <h2>Updates</h2>
        </div>
        <div className="updates">
          {(field.updates || []).map((u) => (
            <div key={u.id} className="update">
              <div className="updateTop">
                <div className="strong">{u.stage}</div>
                <div className="muted">{new Date(u.createdAt).toLocaleString()}</div>
              </div>
              <div className="muted">{u.agent?.email || "—"}</div>
              {u.notes ? <div className="note">{u.notes}</div> : null}
            </div>
          ))}
          {(field.updates || []).length === 0 ? <div className="muted">No updates yet.</div> : null}
        </div>
      </div>
    </div>
  );
}

