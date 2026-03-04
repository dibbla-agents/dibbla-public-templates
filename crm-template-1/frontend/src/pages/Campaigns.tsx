import { useEffect, useState } from "react";

interface Campaign {
  id: number;
  name: string;
  type: string;
  leads_generated: number;
  conversion_rate: number;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const totalLeads = campaigns.reduce((s, c) => s + c.leads_generated, 0);
  const avgConversion =
    campaigns.length > 0
      ? campaigns.reduce((s, c) => s + c.conversion_rate, 0) / campaigns.length
      : 0;
  const bestCampaign = campaigns.reduce(
    (best, c) => (c.conversion_rate > (best?.conversion_rate ?? 0) ? c : best),
    campaigns[0]
  );

  const typeColors: Record<string, string> = {
    Email: "bg-blue-500/15 text-blue-400",
    Social: "bg-purple-500/15 text-purple-400",
    PPC: "bg-orange-500/15 text-orange-400",
    Event: "bg-pink-500/15 text-pink-400",
    Webinar: "bg-cyan-500/15 text-cyan-400",
    Content: "bg-teal-500/15 text-teal-400",
    Referral: "bg-dibbla-green/15 text-dibbla-green",
    Outbound: "bg-amber-500/15 text-amber-400",
    Partner: "bg-indigo-500/15 text-indigo-400",
  };

  const maxLeads = Math.max(...campaigns.map((c) => c.leads_generated), 1);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        <p className="text-sm text-white/40 mt-1">
          Track your marketing efforts and lead generation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-dibbla-card border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Total Leads Generated
          </p>
          <p className="text-2xl font-bold text-white mt-1 animate-count">
            {loading ? "—" : totalLeads.toLocaleString()}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-dibbla-card border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Avg Conversion Rate
          </p>
          <p className="text-2xl font-bold text-dibbla-green mt-1 animate-count">
            {loading ? "—" : `${avgConversion.toFixed(1)}%`}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-dibbla-card border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Best Performer
          </p>
          <p className="text-lg font-bold text-white mt-1 truncate animate-count">
            {loading ? "—" : bestCampaign?.name ?? "—"}
          </p>
          {bestCampaign && (
            <p className="text-xs text-dibbla-green mt-0.5">
              {bestCampaign.conversion_rate}% conversion
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-dibbla-card border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-white/30 text-sm">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-7 h-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
            <p className="text-sm text-white/30">No campaigns yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {c.name}
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        typeColors[c.type] ?? "bg-white/5 text-white/40"
                      }`}
                    >
                      {c.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 max-w-[200px]">
                      <div
                        className="h-full rounded-full bg-dibbla-green/60 transition-all duration-700"
                        style={{
                          width: `${(c.leads_generated / maxLeads) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/40 tabular-nums">
                      {c.leads_generated} leads
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-dibbla-green tabular-nums">
                    {c.conversion_rate}%
                  </p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">
                    Conv. Rate
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
