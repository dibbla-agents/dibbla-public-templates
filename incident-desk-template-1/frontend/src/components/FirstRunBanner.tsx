// Shown when /api/health reports "database":"absent". This is a friendly
// first-run state, not an error: the app is live and working, it just has no
// database attached yet.
export default function FirstRunBanner() {
  return (
    <div className="mb-6 rounded-xl border border-dibbla-green/25 bg-dibbla-green/5 p-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dibbla-green/15 text-dibbla-green">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-white">Your app is live — no database yet</h3>
          <p className="mt-1 text-sm text-white/60 leading-relaxed">
            Lumen is running, but no database is attached, so there are no incidents to show.
            Create a Postgres database with the Dibbla CLI and bind it as{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-dibbla-green">
              DATABASE_URL_LUMEN_INCIDENTS
            </code>
            . The app migrates the schema and seeds demo incidents on the next start.
          </p>
        </div>
      </div>
    </div>
  );
}
