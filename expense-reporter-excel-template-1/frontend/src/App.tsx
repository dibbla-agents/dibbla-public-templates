import { useState, useRef, useCallback, useEffect } from "react";
import { DibblaLogo } from "./components/DibblaLogo";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
}

interface Expense {
  vendor: string;
  amount: number | null;
  currency: string;
  date: string;
  category: string;
  description: string;
  receipt_ref: string | null;
  vat: number | null;
}

type AppState = "upload" | "processing" | "complete" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [state, setState] = useState<AppState>("upload");
  const [step, setStep] = useState("");
  const [workbookUrl, setWorkbookUrl] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Avoid infinite redirect loop: only redirect once per browser session
    if (sessionStorage.getItem("scope_redirect")) return;
    fetch("/api/check-scopes", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.login_url) {
          sessionStorage.setItem("scope_redirect", "1");
          window.location.href = data.login_url;
        } else {
          sessionStorage.removeItem("scope_redirect");
        }
      })
      .catch(() => {});
  }, []);

  const uploadFiles = useCallback(async (fileList: FileList) => {
    const pdfs = Array.from(fileList).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (pdfs.length === 0) return;

    const formData = new FormData();
    for (const f of pdfs) {
      formData.append("files", f);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        setState("error");
        return;
      }
      setFiles((prev) => [...prev, ...data.files]);
    } catch {
      setError("Failed to upload files");
      setState("error");
    }
  }, []);

  const removeFile = async (id: string) => {
    await fetch(`/api/uploads/${id}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const generateReport = async () => {
    setState("processing");
    setError(null);
    setLoginUrl(null);

    try {
      setStep("Reading receipts and extracting expenses...");
      const res = await fetch("/api/generate-report", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.login_url) {
          setLoginUrl(data.login_url);
          throw new Error("Microsoft OneDrive access is required. Click the button below to grant permission.");
        }
        throw new Error(data.error || "Report generation failed");
      }

      setWorkbookUrl(data.workbook_url);
      setExpenses(data.expenses || []);
      setState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  const startOver = () => {
    setFiles([]);
    setState("upload");
    setWorkbookUrl(null);
    setExpenses([]);
    setError(null);
    setLoginUrl(null);
    setStep("");
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const total = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const currencies = [...new Set(expenses.map((e) => e.currency).filter(Boolean))];

  return (
    <div className="min-h-screen bg-dibbla-dark overflow-x-hidden flex flex-col">
      <div className="flex-1 flex flex-col items-center px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-8 text-dibbla-green">
            <DibblaLogo />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Expense Reporter
          </h1>
        </div>

        {/* Upload state */}
        {(state === "upload" || state === "error") && (
          <div className="w-full max-w-2xl">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-dibbla-green bg-dibbla-green/10"
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <svg
                className="w-12 h-12 mx-auto mb-4 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-white/50 text-lg mb-1">
                Drop PDF receipts here
              </p>
              <p className="text-white/30 text-sm">or click to browse</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between bg-dibbla-card rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 18h12a2 2 0 002-2V6.414A2 2 0 0017.414 5L14 1.586A2 2 0 0012.586 1H4a2 2 0 00-2 2v13a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white/80 text-sm truncate">
                        {f.name}
                      </span>
                      <span className="text-white/30 text-xs flex-shrink-0">
                        {formatBytes(f.size)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f.id);
                      }}
                      className="text-white/30 hover:text-white/60 transition-colors ml-2 cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error message */}
            {state === "error" && error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
                {loginUrl && (
                  <a
                    href={loginUrl}
                    className="mt-3 inline-block px-4 py-2 rounded-lg bg-dibbla-green text-dibbla-dark font-semibold text-sm transition-all duration-200 hover:brightness-110"
                  >
                    Grant Microsoft OneDrive Access
                  </a>
                )}
              </div>
            )}

            {/* Generate button */}
            {files.length > 0 && (
              <button
                onClick={generateReport}
                className="mt-6 w-full py-3 rounded-lg bg-dibbla-green text-dibbla-dark font-bold text-base transition-all duration-200 hover:brightness-110 cursor-pointer"
              >
                Generate Expense Report ({files.length} receipt
                {files.length !== 1 ? "s" : ""})
              </button>
            )}
          </div>
        )}

        {/* Processing state */}
        {state === "processing" && (
          <div className="w-full max-w-2xl flex flex-col items-center py-16">
            <div className="w-12 h-12 border-4 border-dibbla-green/30 border-t-dibbla-green rounded-full animate-spin mb-6" />
            <p className="text-white text-lg font-semibold mb-2">{step}</p>
            <p className="text-white/40 text-sm">
              This may take a moment depending on the number of receipts.
            </p>
          </div>
        )}

        {/* Complete state */}
        {state === "complete" && (
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-dibbla-green"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-2">
                Expense Report Created
              </h2>
              <p className="text-white/50">
                {expenses.length} expense{expenses.length !== 1 ? "s" : ""}{" "}
                extracted &middot; Total: {total.toFixed(2)}{" "}
                {currencies.length === 1 ? currencies[0] : "mixed currencies"}
              </p>
            </div>

            {workbookUrl && (
              <a
                href={workbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-lg bg-dibbla-green text-dibbla-dark font-bold text-base text-center transition-all duration-200 hover:brightness-110"
              >
                Open in Excel
              </a>
            )}

            {/* Expense preview */}
            {expenses.length > 0 && (
              <div className="mt-6 bg-dibbla-card rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/50 font-medium px-4 py-3">
                        Date
                      </th>
                      <th className="text-left text-white/50 font-medium px-4 py-3">
                        Vendor
                      </th>
                      <th className="text-left text-white/50 font-medium px-4 py-3">
                        Category
                      </th>
                      <th className="text-left text-white/50 font-medium px-4 py-3">
                        Description
                      </th>
                      <th className="text-right text-white/50 font-medium px-4 py-3">
                        Amount
                      </th>
                      <th className="text-right text-white/50 font-medium px-4 py-3">
                        VAT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="text-white/60 px-4 py-2 whitespace-nowrap">
                          {e.date || "—"}
                        </td>
                        <td className="text-white/80 px-4 py-2">
                          {e.vendor || "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50">
                            {e.category || "—"}
                          </span>
                        </td>
                        <td className="text-white/60 px-4 py-2 max-w-xs truncate">
                          {e.description || "—"}
                        </td>
                        <td className="text-white/80 px-4 py-2 text-right whitespace-nowrap">
                          {e.amount != null ? e.amount.toFixed(2) : "—"}{" "}
                          <span className="text-white/40">{e.currency}</span>
                        </td>
                        <td className="text-white/50 px-4 py-2 text-right whitespace-nowrap">
                          {e.vat != null ? e.vat.toFixed(2) : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/10">
                      <td
                        colSpan={4}
                        className="text-white/50 font-semibold px-4 py-3 text-right"
                      >
                        Total
                      </td>
                      <td className="text-white font-semibold px-4 py-3 text-right whitespace-nowrap">
                        {total.toFixed(2)}{" "}
                        <span className="text-white/40">
                          {currencies.length === 1 ? currencies[0] : ""}
                        </span>
                      </td>
                      <td className="text-white/50 font-semibold px-4 py-3 text-right whitespace-nowrap">
                        {expenses
                          .reduce((sum, e) => sum + (e.vat ?? 0), 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={startOver}
              className="mt-4 w-full py-3 rounded-lg bg-white/5 border border-white/10 text-white font-semibold text-base transition-all duration-200 hover:bg-white/10 cursor-pointer"
            >
              Start Over
            </button>
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
