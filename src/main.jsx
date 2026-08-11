import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import UnifiedApp from "./UnifiedApp.jsx";
import OverviewScreen from "./OverviewScreen.jsx";

const LiveAnalysis = lazy(() => import("./LiveAnalysis.jsx"));

const shellFont = "Inter, ui-sans-serif, system-ui, sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function OverviewHeader({ onNavigate }) {
  const items = [
    ["overview", "Overview"],
    ["dashboard", "QC Dashboard"],
    ["profiles", "Rule Profiles"],
    ["governance", "AI Governance"],
  ];
  return <header style={{ background: "#fff", borderBottom: "1px solid #dfe6e2", padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontFamily: shellFont }}>
    <button type="button" onClick={() => onNavigate("overview")} style={{ border: 0, background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#14211d" }}>
      <span style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: "#0d6259", color: "white", fontWeight: 800 }}>AY</span>
      <span style={{ textAlign: "left" }}><b>Assay</b><span style={{ display: "block", fontFamily: mono, color: "#60706a", fontSize: 10 }}>post-execution mortgage QC</span></span>
    </button>
    <nav style={{ display: "flex", gap: 6 }}>
      {items.map(([id, label]) => <button key={id} type="button" onClick={() => onNavigate(id)} style={{ fontFamily: mono, border: `1px solid ${id === "overview" ? "#0d6259" : "#dfe6e2"}`, color: id === "overview" ? "#0d6259" : "#60706a", background: id === "overview" ? "#e4f0ee" : "#fff", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: 11 }}>{label}</button>)}
    </nav>
    <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
      <div style={{ fontFamily: mono, color: "#60706a", fontSize: 9 }}>EXPERIENCE MODE</div>
      <div style={{ display: "flex", border: "1px solid #dfe6e2", borderRadius: 8, padding: 3, background: "#f5f7f6" }}>
        <button type="button" onClick={() => onNavigate("dashboard")} style={{ fontFamily: mono, border: 0, background: "#e4f0ee", color: "#0d6259", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6, cursor: "pointer" }}>Demo Workspace</button>
        <a href="/live" style={{ fontFamily: mono, textDecoration: "none", color: "#60706a", fontSize: 10, fontWeight: 750, padding: "6px 9px", borderRadius: 6 }}>Live Analysis</a>
      </div>
      <div style={{ color: "#60706a", fontSize: 10 }}>Sample data + live Azure path · portfolio prototype</div>
    </div>
  </header>;
}

function goToWorkspace(screen = "dashboard") {
  try { window.sessionStorage.setItem("assay.workspace.start", screen); } catch { /* optional navigation hint */ }
  window.location.assign("/?workspace=1");
}

function WorkspaceEntry() {
  useEffect(() => {
    let target = "dashboard";
    try {
      target = window.sessionStorage.getItem("assay.workspace.start") || "dashboard";
      window.sessionStorage.removeItem("assay.workspace.start");
    } catch { /* dashboard remains the fallback */ }
    if (target === "dashboard") return;

    const labels = { profiles: "Rule Profiles", governance: "AI Governance" };
    const expected = labels[target];
    if (!expected) return;

    const timer = window.setTimeout(() => {
      const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === expected);
      button?.click();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <UnifiedApp />;
}

function Root() {
  const params = new URLSearchParams(window.location.search);
  const isLive = window.location.pathname === "/live";
  const hasCase = params.has("case");
  const workspace = params.has("workspace");

  if (isLive) {
    return <Suspense fallback={<div style={{ padding: 40, fontFamily: shellFont }}>Loading Live Analysis…</div>}><LiveAnalysis /></Suspense>;
  }

  if (hasCase) return <UnifiedApp />;
  if (workspace) return <WorkspaceEntry />;

  const navigate = (screen) => {
    if (screen === "overview") return;
    goToWorkspace(screen);
  };

  return <div style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    <OverviewHeader onNavigate={navigate} />
    <OverviewScreen onNavigate={navigate} />
    <footer style={{ fontFamily: mono, textAlign: "center", color: "#60706a", fontSize: 10, padding: 24 }}>Assay · sample-data portfolio prototype · not legal or compliance advice</footer>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
