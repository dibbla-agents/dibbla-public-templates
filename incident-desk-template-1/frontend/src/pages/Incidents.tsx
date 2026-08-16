import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  severityClass,
  isResolved,
  REGIONS,
  SEVERITIES,
  type DatabaseState,
  type Incident,
} from "../lib/api";
import FirstRunBanner from "../components/FirstRunBanner";

export default function Incidents({ database }: { database: DatabaseState }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("");
  const [severity, setSeverity] = useState("");
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .incidents({ region, severity, resolved, limit: 100 })
      .then((page) => {
        setIncidents(page.items);
        setTotal(page.total);
      })
      .catch(() => {
        setIncidents([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [region, severity, resolved]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Incidents</h1>
        <p className="text-sm text-white/50 mt-1">
          Every incident across the Lumen service fleet.
        </p>
      </header>

      {database === "absent" && <FirstRunBanner />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Select label="Region" value={region} onChange={setRegion} options={REGIONS} />
        <Select label="Severity" value={severity} onChange={setSeverity} options={SEVERITIES} />
        <Select label="State" value={resolved} onChange={setResolved} options={["open", "resolved"]} />
        <div className="ml-auto self-end text-xs text-white/40">
          {loading ? "Loading…" : `${total} incident${total === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/5 bg-dibbla-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/5">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium">Opened</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr
                key={inc.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/incidents/${inc.id}`}
                    className="text-white/90 hover:text-dibbla-green transition-colors font-medium"
                  >
                    {inc.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">{inc.region}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${severityClass(
                      inc.severity
                    )}`}
                  >
                    {inc.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      isResolved(inc) ? "text-white/40" : "text-dibbla-green"
                    }`}
                  >
                    {isResolved(inc) ? "resolved" : "open"}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs">
                  {new Date(inc.opened_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!loading && incidents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/40 text-sm">
                  {database === "absent"
                    ? "Attach a database to see incidents."
                    : "No incidents match these filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-dibbla-card px-3 py-1.5 text-sm text-white/80 focus:border-dibbla-green/50 focus:outline-none capitalize"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
