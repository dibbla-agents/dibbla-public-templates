import { useEffect, useState } from "react";
import { DibblaLogo } from "./components/DibblaLogo";

function App() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => setGreeting(data.message))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="relative min-h-screen bg-dibbla-dark overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(118,179,96,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(118,179,96,0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Gradient blur accents */}
      <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] rounded-full bg-dibbla-green/3 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-dibbla-green/3 blur-[150px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Dibbla Logo */}
        <div className="mb-8 w-20 text-dibbla-green">
          <DibblaLogo />
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight text-center">
          {error ? (
            <span className="text-red-400">Failed to load</span>
          ) : greeting ? (
            <>
              {greeting.replace(/(\S+)$/, "").trim()}{" "}
              <span className="text-dibbla-green">{greeting.split(" ").pop()}</span>
            </>
          ) : (
            <span className="text-white/40">Loading...</span>
          )}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/60 mb-12 max-w-xl text-center leading-relaxed">
          A minimal starter template powered by Go Fiber, React, TypeScript, and
          Tailwind CSS — all served from a single binary.
        </p>

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-[2px] w-20 bg-dibbla-green/40" />
          <div className="w-2 h-2 rounded-full bg-dibbla-green" />
          <div className="h-[2px] w-20 bg-dibbla-green/40" />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            }
            title="Go Fiber"
            description="Lightning-fast web framework with embedded static file serving."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            }
            title="React + TypeScript"
            description="Modern UI with type safety, built and bundled by Vite."
          />
          <FeatureCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            title="Single Binary"
            description="Frontend embedded into the Go binary — deploy anywhere with Docker."
          />
        </div>

        {/* Footer */}
        <div className="mt-16 text-sm text-white/30 uppercase tracking-[0.2em]">
          Getting Started Template
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-dibbla-green/30">
      <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-dibbla-green/20 text-dibbla-green">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}

export default App;
