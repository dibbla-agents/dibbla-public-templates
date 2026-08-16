import { useEffect, useState } from "react";
import { api, type DatabaseState, type Rollup } from "../lib/api";
import FirstRunBanner from "../components/FirstRunBanner";

export default function Rollups({ database }: { database: DatabaseState }) {
  const [rollups, setRollups] = useState<Rollup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .rollups()
      .then(setRollups)
      .catch(() => setRollups([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Rollups</h1>
        <p className="text-sm text-white/50 mt-1">
          Nightly per-region incident summaries.
        </p>
      </header>

      {database === "absent" && <FirstRunBanner />}

      {!loading && rollups.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-dibbla-card/60 p-10 text-center">
          <p className="text-sm text-white/60 font-medium">Nothing here yet</p>
          <p className="text-sm text-white/40 mt-2 max-w-md mx-auto leading-relaxed">
            Rollups are written by a nightly job. Stage 5 of the tutorial builds that
            job — once it runs, per-region summaries appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-dibbla-card/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/5">
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Resolved</th>
                <th className="px-4 py-3 font-medium">Still open</th>
                <th className="px-4 py-3 font-medium">Worst</th>
              </tr>
            </thead>
            <tbody>
              {rollups.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-white/70 text-xs">
                    {r.period_start} → {r.period_end}
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.region}</td>
                  <td className="px-4 py-3 text-white/70">{r.total}</td>
                  <td className="px-4 py-3 text-white/40">{r.resolved}</td>
                  <td className="px-4 py-3 text-dibbla-green">{r.still_open}</td>
                  <td className="px-4 py-3 text-white/70 capitalize">
                    {r.worst_severity ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
