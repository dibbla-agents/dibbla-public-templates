import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

interface Metrics {
  total_contacts: number;
  active_leads: number;
  customers: number;
  avg_score: number;
  pipeline_value: number;
  total_leads_generated: number;
  avg_conversion: number;
  pending_tasks: number;
}

interface Task {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  is_completed: boolean;
  contact: { name: string };
}

interface Campaign {
  id: number;
  name: string;
  type: string;
  leads_generated: number;
  conversion_rate: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const fetchAll = useCallback(() => {
    fetch("/api/metrics").then((r) => r.json()).then(setMetrics);
    fetch("/api/tasks").then((r) => r.json()).then(setTasks);
    fetch("/api/campaigns").then((r) => r.json()).then(setCampaigns);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleTask = async (id: number) => {
    const res = await fetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success(updated.is_completed ? "Task completed!" : "Task reopened");
      fetch("/api/metrics").then((r) => r.json()).then(setMetrics);
    }
  };

  const pendingTasks = tasks.filter((t) => !t.is_completed).slice(0, 8);
  const topCampaigns = campaigns.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">
          Real-time overview of your growth pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pipeline Value"
          value={metrics ? `$${(metrics.pipeline_value / 1000).toFixed(0)}k` : "—"}
          sub="Estimated total"
          accent
          live
        />
        <MetricCard
          label="Active Leads"
          value={metrics?.active_leads ?? "—"}
          sub="Awaiting qualification"
          live
        />
        <MetricCard
          label="Campaign ROI"
          value={metrics ? `${metrics.avg_conversion.toFixed(1)}%` : "—"}
          sub="Avg conversion rate"
          live
        />
        <MetricCard
          label="Pending Tasks"
          value={metrics?.pending_tasks ?? "—"}
          sub="Needs attention"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-dibbla-card border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Total Contacts</p>
          <p className="text-2xl font-bold text-white mt-1 animate-count">
            {metrics?.total_contacts ?? "—"}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-dibbla-card border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Customers</p>
          <p className="text-2xl font-bold text-dibbla-green mt-1 animate-count">
            {metrics?.customers ?? "—"}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-dibbla-card border border-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Avg Lead Score</p>
          <p className="text-2xl font-bold text-white mt-1 animate-count">
            {metrics ? metrics.avg_score.toFixed(0) : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-dibbla-card border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Tasks</h2>
            <Link
              to="/tasks"
              className="text-xs text-dibbla-green hover:text-dibbla-green/80 transition-colors"
            >
              View all →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <EmptyState message="No pending tasks — you're all caught up!" />
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-dibbla-card border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Top Campaigns</h2>
            <Link
              to="/campaigns"
              className="text-xs text-dibbla-green hover:text-dibbla-green/80 transition-colors"
            >
              View all →
            </Link>
          </div>
          {topCampaigns.length === 0 ? (
            <EmptyState message="No campaigns yet" />
          ) : (
            <div className="space-y-3">
              {topCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{c.name}</p>
                    <p className="text-xs text-white/40">{c.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-dibbla-green">
                      {c.leads_generated} leads
                    </p>
                    <p className="text-xs text-white/40">
                      {c.conversion_rate}% conv.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
  live,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
  live?: boolean;
}) {
  return (
    <div
      className={`relative p-5 rounded-xl border transition-all duration-300 ${
        accent
          ? "bg-dibbla-green/10 border-dibbla-green/20"
          : "bg-dibbla-card border-white/5"
      }`}
    >
      {live && (
        <span className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-dibbla-green animate-pulse-glow" />
          <span className="text-[10px] text-dibbla-green/70 uppercase tracking-wider font-medium">
            Live
          </span>
        </span>
      )}
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p
        className={`text-3xl font-bold mt-1 animate-count ${
          accent ? "text-dibbla-green" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-white/30 mt-1">{sub}</p>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: number) => void;
}) {
  const priorityColor =
    task.priority === "High"
      ? "text-red-400"
      : task.priority === "Medium"
      ? "text-yellow-400"
      : "text-white/40";

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group">
      <button
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          task.is_completed
            ? "bg-dibbla-green border-dibbla-green"
            : "border-white/20 hover:border-dibbla-green/50"
        }`}
      >
        {task.is_completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.is_completed ? "text-white/30 line-through" : "text-white"}`}>
          {task.title}
        </p>
        <p className="text-xs text-white/30 truncate">
          {task.contact?.name} · {task.due_date}
        </p>
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${priorityColor}`}>
        {task.priority}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center">
        <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <p className="text-sm text-white/30">{message}</p>
    </div>
  );
}
