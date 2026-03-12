import { useEffect, useState } from "react";
import { DibblaLogo } from "./components/DibblaLogo";
import { Confetti } from "./components/Confetti";

const SAMPLE_PROMPT =
  "Change this page into a personal portfolio site with my name, a short bio, and links to my social media profiles.";

function App() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard.writeText(SAMPLE_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
    <div className="h-screen bg-dibbla-dark overflow-hidden flex flex-col">
      <Confetti fire={!!greeting} />

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="mb-5 w-16 text-dibbla-green">
          <DibblaLogo />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tight text-center">
          {error ? (
            <span className="text-red-400">Something went wrong</span>
          ) : greeting ? (
            <>
              {"You're "}
              <span className="text-dibbla-green">Live!</span>
            </>
          ) : (
            <span className="text-white/40">Setting things up...</span>
          )}
        </h1>

        <p className="text-lg md:text-xl text-white/50 mb-8 max-w-lg text-center">
          {error
            ? "Your app couldn't connect to the server. Check that everything is running and try again."
            : greeting
              ? "Let's start building together!"
              : "Connecting to your server..."}
        </p>

        {greeting && (
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="rounded-xl bg-dibbla-green/10 border-2 border-dibbla-green/40 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-dibbla-green text-dibbla-dark font-bold text-base flex items-center justify-center">1</span>
                <p className="text-white text-base font-semibold">Copy this prompt</p>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-4 flex-1">
                "{SAMPLE_PROMPT}"
              </p>
              <button
                onClick={copyPrompt}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-dibbla-green text-dibbla-dark font-bold text-sm transition-all duration-200 hover:brightness-110 cursor-pointer"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy prompt
                  </>
                )}
              </button>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-dibbla-green text-dibbla-dark font-bold text-base flex items-center justify-center">2</span>
                <p className="text-white text-base font-semibold">Open your AI App Builder</p>
              </div>
              <p className="text-white/40 text-sm leading-relaxed mb-4 flex-1">
                Cursor, Claude Code, OpenCode, or any AI coding tool you prefer.
              </p>
              <a
                href={`cursor://file${__PROJECT_PATH__}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-semibold text-sm transition-all duration-200 hover:bg-white/15"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in Cursor
              </a>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-dibbla-green text-dibbla-dark font-bold text-base flex items-center justify-center">3</span>
                <p className="text-white text-base font-semibold">Paste the prompt into the chat</p>
              </div>
              <p className="text-white/40 text-sm leading-relaxed flex-1">
                The AI will transform this app based on your prompt. Watch the magic happen!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pb-6 text-center text-xs text-white/20 uppercase tracking-[0.2em]">
        Powered by Dibbla
      </div>
    </div>
  );
}

export default App;
