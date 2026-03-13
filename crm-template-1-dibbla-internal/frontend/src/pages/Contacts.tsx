import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface Contact {
  id: number;
  name: string;
  email: string;
  company: string;
  status: string;
  score: number;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/contacts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setContacts(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [search, statusFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const deleteContact = async (id: number, name: string) => {
    if (!confirm(`Delete ${name}? This will also remove their tasks.`)) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success(`${name} removed`);
    }
  };

  const statusColors: Record<string, string> = {
    Lead: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    Opportunity: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Customer: "bg-dibbla-green/15 text-dibbla-green border-dibbla-green/20",
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-white/40 mt-1">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""} in your
            pipeline
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-dibbla-green text-white rounded-lg text-sm font-semibold hover:bg-dibbla-green/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Lead
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dibbla-card border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-dibbla-green/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {["", "Lead", "Opportunity", "Customer"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-dibbla-green/15 text-dibbla-green border border-dibbla-green/20"
                  : "bg-dibbla-card text-white/50 border border-white/5 hover:text-white/80"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-dibbla-card border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-white/30 text-sm">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-7 h-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm text-white/30 mb-1">No contacts found</p>
            <p className="text-xs text-white/20">Add your first lead to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] font-medium text-white/30 uppercase tracking-wider px-5 py-3">
                  Name
                </th>
                <th className="text-left text-[11px] font-medium text-white/30 uppercase tracking-wider px-5 py-3">
                  Company
                </th>
                <th className="text-left text-[11px] font-medium text-white/30 uppercase tracking-wider px-5 py-3">
                  Status
                </th>
                <th className="text-left text-[11px] font-medium text-white/30 uppercase tracking-wider px-5 py-3">
                  Score
                </th>
                <th className="text-right text-[11px] font-medium text-white/30 uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-white/30">{c.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-white/60">
                    {c.company}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        statusColors[c.status] ?? "bg-white/5 text-white/50"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 max-w-[80px]">
                        <div
                          className="h-full rounded-full bg-dibbla-green transition-all duration-500"
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/50 tabular-nums">
                        {c.score}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => deleteContact(c.id, c.name)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <NewContactModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}

function NewContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    status: "Lead",
    score: 50,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("New seed planted!");
      onCreated();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create contact");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-dibbla-card border border-white/10 p-6 shadow-2xl animate-fade-in-up">
        <h2 className="text-lg font-bold text-white mb-5">Add New Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-dibbla-green/40"
              placeholder="Jane Cooper"
            />
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-dibbla-green/40"
              placeholder="jane@acme.io"
            />
          </Field>
          <Field label="Company">
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-dibbla-green/40"
              placeholder="Acme Inc."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-dibbla-green/40"
              >
                <option value="Lead">Lead</option>
                <option value="Opportunity">Opportunity</option>
                <option value="Customer">Customer</option>
              </select>
            </Field>
            <Field label={`Score: ${form.score}`}>
              <input
                type="range"
                min={1}
                max={100}
                value={form.score}
                onChange={(e) =>
                  setForm({ ...form, score: Number(e.target.value) })
                }
                className="w-full mt-2 accent-[#76b360]"
              />
            </Field>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-dibbla-green text-white rounded-lg text-sm font-semibold hover:bg-dibbla-green/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
        {label}
        {required && <span className="text-dibbla-green ml-0.5">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
