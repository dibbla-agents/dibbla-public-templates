// Thin fetch wrapper around the Go backend's /api surface. All paths are
// relative — Vite proxies /api to the backend in dev, and the embedded server
// serves both the SPA and the API from one origin in production.

export type DatabaseState = "connected" | "absent";

export interface Health {
  status: string;
  database: DatabaseState;
  app: string;
}

export interface Service {
  id: number;
  name: string;
  tier: number;
}

export type Severity = "low" | "medium" | "high" | "critical";

export interface Incident {
  id: number;
  service_id: number;
  region: string;
  title: string;
  body: string;
  severity: Severity;
  opened_at: string;
  // null while the incident is still open.
  resolved_at: string | null;
}

// An incident is "resolved" when it has a resolved_at timestamp.
export function isResolved(inc: Incident): boolean {
  return inc.resolved_at !== null;
}

export interface IncidentPage {
  items: Incident[];
  total: number;
  limit: number;
  offset: number;
}

export interface Rollup {
  id: number;
  created_at: string;
  period_start: string;
  period_end: string;
  region: string;
  total: number;
  resolved: number;
  still_open: number;
  worst_severity: string | null;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => getJSON<Health>("/api/health"),
  services: () => getJSON<Service[]>("/api/services"),
  rollups: () => getJSON<Rollup[]>("/api/rollups"),
  incident: (id: number) => getJSON<Incident>(`/api/incidents/${id}`),
  incidents: (params: {
    region?: string;
    severity?: string;
    resolved?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    const qs = q.toString();
    return getJSON<IncidentPage>(`/api/incidents${qs ? `?${qs}` : ""}`);
  },
};

export const REGIONS = ["eu-north", "eu-central", "us-east", "ap-south"];
export const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export function severityClass(sev: string): string {
  switch (sev) {
    case "critical":
      return "text-sev-critical border-sev-critical/40 bg-sev-critical/10";
    case "high":
      return "text-sev-high border-sev-high/40 bg-sev-high/10";
    case "medium":
      return "text-sev-medium border-sev-medium/40 bg-sev-medium/10";
    default:
      return "text-sev-low border-sev-low/40 bg-sev-low/10";
  }
}
