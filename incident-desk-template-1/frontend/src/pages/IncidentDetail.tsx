import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, severityClass, isResolved, type Incident } from "../lib/api";

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .incident(Number(id))
      .then(setIncident)
      .catch(() => setError("Incident not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="max-w-4xl mx-auto text-white/40 text-sm">Loading…</div>;
  }
  if (error || !incident) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm text-dibbla-green hover:underline">
          ← Back to incidents
        </Link>
        <p className="mt-6 text-white/50">{error ?? "Incident not found."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Link to="/" className="text-sm text-dibbla-green hover:underline">
        ← Back to incidents
      </Link>

      <header className="mt-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white tracking-tight">{incident.title}</h1>
          <span
            className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${severityClass(
              incident.severity
            )}`}
          >
            {incident.severity}
          </span>
        </div>
        <p className="text-sm text-white/50 mt-2">
          {incident.region} ·{" "}
          <span className={isResolved(incident) ? "text-white/50" : "text-dibbla-green"}>
            {isResolved(incident) ? "resolved" : "open"}
          </span>{" "}
          · opened {new Date(incident.opened_at).toLocaleString()}
          {incident.resolved_at &&
            ` · resolved ${new Date(incident.resolved_at).toLocaleString()}`}
        </p>
      </header>

      <section className="rounded-xl border border-white/5 bg-dibbla-card/60 p-5 mb-5">
        <h2 className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Description</h2>
        <p className="text-sm text-white/80 leading-relaxed">{incident.body}</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <AIPanel
          title="AI Summary"
          endpoint={`/api/incidents/${incident.id}/summarise`}
          actionLabel="Summarise"
        />
        <AIPanel
          title="AI Triage"
          endpoint={`/api/incidents/${incident.id}/triage`}
          actionLabel="Triage"
        />
      </div>
    </div>
  );
}

// AIPanel calls a not-yet-enabled endpoint and shows the "coming in a later
// stage" message the backend returns (HTTP 501). Once stage 3/4 of the tutorial
// wires the AI-gateway call, the same panel renders the real result.
function AIPanel({
  title,
  endpoint,
  actionLabel,
}: {
  title: string;
  endpoint: string;
  actionLabel: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMessage(data.message ?? `Request returned ${res.status}`);
    } catch {
      setMessage("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/5 bg-dibbla-card/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button
          onClick={run}
          disabled={busy}
          className="rounded-lg border border-dibbla-green/30 bg-dibbla-green/10 px-3 py-1 text-xs font-medium text-dibbla-green hover:bg-dibbla-green/20 transition-colors disabled:opacity-50"
        >
          {busy ? "…" : actionLabel}
        </button>
      </div>
      <p className="text-sm text-white/50 leading-relaxed">
        {message ?? "Not enabled yet. Run it to see what the tutorial wires up here."}
      </p>
    </section>
  );
}
