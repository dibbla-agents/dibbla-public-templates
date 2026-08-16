import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import Rollups from "./pages/Rollups";
import { api, type DatabaseState } from "./lib/api";

export interface AppContext {
  database: DatabaseState;
}

function App() {
  const [database, setDatabase] = useState<DatabaseState>("connected");

  useEffect(() => {
    api
      .health()
      .then((h) => setDatabase(h.database))
      .catch(() => setDatabase("absent"));
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            color: "#fff",
            border: "1px solid #2a2a2a",
            fontSize: "14px",
          },
          success: {
            iconTheme: { primary: "#76b360", secondary: "#fff" },
          },
        }}
      />
      <Routes>
        <Route element={<Layout database={database} />}>
          <Route path="/" element={<Incidents database={database} />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/rollups" element={<Rollups database={database} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
