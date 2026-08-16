import { NavLink, Outlet } from "react-router-dom";
import { DibblaLogo } from "./DibblaLogo";
import type { DatabaseState } from "../lib/api";

const navItems = [
  { to: "/", label: "Incidents", icon: AlertIcon },
  { to: "/rollups", label: "Rollups", icon: ChartIcon },
];

export default function Layout({ database }: { database: DatabaseState }) {
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
              Lumen
            </h1>
            <span className="text-[11px] text-dibbla-green font-medium tracking-wider uppercase">
              Incident Desk
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
            Database
          </p>
          <p className="text-xs text-white/60 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                database === "connected" ? "bg-dibbla-green" : "bg-white/30"
              }`}
            />
            {database === "connected" ? "Connected" : "Not attached"}
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 ml-64 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
