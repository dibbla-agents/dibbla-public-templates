import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface Contact {
  id: number;
  name: string;
}

interface Task {
  id: number;
  contact_id: number;
  title: string;
  due_date: string;
  priority: string;
  is_completed: boolean;
  contact: Contact;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTasks();
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []));
  }, [fetchTasks]);

  const toggleTask = async (id: number) => {
    const res = await fetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success(updated.is_completed ? "Task completed!" : "Task reopened");
    }
  };

  const deleteTask = async (id: number) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    }
  };

  const pending = tasks.filter((t) => !t.is_completed);
  const completed = tasks.filter((t) => t.is_completed);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-white/40 mt-1">
            {pending.length} pending · {completed.length} completed
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-dibbla-green text-white rounded-lg text-sm font-semibold hover:bg-dibbla-green/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Task
        </button>
      </div>

      {showForm && (
        <NewTaskForm
          contacts={contacts}
          onCreated={() => {
            setShowForm(false);
            fetchTasks();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="text-center text-white/30 text-sm py-10">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl bg-dibbla-card border border-white/5 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-white/30 mb-1">No tasks yet</p>
          <p className="text-xs text-white/20">Create your first task to stay on track</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div className="rounded-xl bg-dibbla-card border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                  Pending ({pending.length})
                </h2>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {pending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="rounded-xl bg-dibbla-card border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white/30 uppercase tracking-wider">
                  Completed ({completed.length})
                </h2>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const priorityColor =
    task.priority === "High"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : task.priority === "Medium"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-white/5 text-white/40 border-white/10";

  const isOverdue =
    !task.is_completed && new Date(task.due_date) < new Date();

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
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
        <p
          className={`text-sm font-medium ${
            task.is_completed ? "text-white/30 line-through" : "text-white"
          }`}
        >
          {task.title}
        </p>
        <p className="text-xs text-white/30 mt-0.5">
          {task.contact?.name ?? "Unknown"}
        </p>
      </div>

      <span
        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${priorityColor}`}
      >
        {task.priority}
      </span>

      <span
        className={`text-xs tabular-nums ${
          isOverdue ? "text-red-400" : "text-white/30"
        }`}
      >
        {task.due_date}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        className="text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function NewTaskForm({
  contacts,
  onCreated,
  onCancel,
}: {
  contacts: Contact[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    contact_id: contacts[0]?.id ?? 0,
    due_date: new Date().toISOString().slice(0, 10),
    priority: "Medium",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id) {
      toast.error("Select a contact first");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Task created!");
      onCreated();
    } else {
      toast.error("Failed to create task");
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl bg-dibbla-card border border-dibbla-green/20 p-5 animate-fade-in-up">
      <h3 className="text-sm font-semibold text-white mb-4">Create New Task</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-white/40 uppercase tracking-wider">
              Title<span className="text-dibbla-green ml-0.5">*</span>
            </span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-dibbla-green/40"
              placeholder="Follow up on proposal"
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/40 uppercase tracking-wider">
              Contact<span className="text-dibbla-green ml-0.5">*</span>
            </span>
            <select
              value={form.contact_id}
              onChange={(e) =>
                setForm({ ...form, contact_id: Number(e.target.value) })
              }
              className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-dibbla-green/40"
            >
              <option value={0} disabled>
                Select contact...
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/40 uppercase tracking-wider">
              Due Date
            </span>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-dibbla-green/40"
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/40 uppercase tracking-wider">
              Priority
            </span>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="mt-1.5 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-dibbla-green/40"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-dibbla-green text-white rounded-lg text-sm font-semibold hover:bg-dibbla-green/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
