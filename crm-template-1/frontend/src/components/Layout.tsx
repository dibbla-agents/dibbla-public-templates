import { NavLink, Outlet } from "react-router-dom";
import { DibblaLogo } from "./DibblaLogo";

const navItems = [
  { to: "/", label: "Dashboard", icon: ChartIcon },
  { to: "/contacts", label: "Contacts", icon: UsersIcon },
  { to: "/tasks", label: "Tasks", icon: ChecklistIcon },
  { to: "/campaigns", label: "Campaigns", icon: RocketIcon },
];

export default function Layout() {
  return (
    <div className="relative min-h-screen bg-dibbla-dark flex">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(118,179,96,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(118,179,96,0.015) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div className="fixed top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-dibbla-green/3 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-dibbla-green/3 blur-[150px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-dibbla-card/80 backdrop-blur-xl border-r border-white/5 z-20 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 text-dibbla-green">
            <DibblaLogo />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              Dibbla
            </h1>
            <span className="text-[11px] text-dibbla-green font-medium tracking-wider uppercase">
              Growth Engine
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-dibbla-green/15 text-dibbla-green"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 mx-3 mb-4 rounded-lg bg-dibbla-green/5 border border-dibbla-green/10">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">
            Platform
          </p>
          <p className="text-xs text-white/60">CRM Demo — Dibbla</p>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 ml-64 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}
