import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import UnifiedApp from "./UnifiedApp.jsx";
import OverviewScreen from "./OverviewScreen.jsx";

const LiveAnalysis = lazy(() => import("./LiveAnalysis.jsx"));
const PackageAnalysis = lazy(() => import("./PackageAnalysis.jsx"));
const EvaluationScreen = lazy(() => import("./EvaluationScreen.jsx"));
const HumanCorrectionDemo = lazy(() => import("./HumanCorrectionDemo.jsx"));

const shellFont = "Inter, ui-sans-serif, system-ui, sans-serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function ProductHeader({ active = "overview" }) {
  const items = [
    ["overview", "Overview"],
    ["dashboard", "QC Dashboard"],
    ["human-review", "Human Review"],
    ["profiles", "Rule Profiles"],
    ["governance", "AI Governance"],
    ["evaluation", "Evaluation"],
  ];

  const navigate = (id) => {
    if (id === "overview") {
      window.location.assign("/");
      return;
    }
    if (id === "evaluation") {
      window.location.assign("/evaluation");
      return;
    }
    if (id === "human-review") {
      window.location.assign("/human-review");
      return;
    }
    goToWorkspace(id);
  };

  return <header style={{ background: "#fff", borderBottom: "1px solid #dfe6e2", padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontFamily: shellFont }}>
    <button type="button" onClick={() => navigate("overview")} style={{ border: 0, background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "#14211d" }}>
      <span style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: "#0d6259", color: "white", fontWeight: 800 }}>AY</span>
      <span style={{ textAlign: "left" }}><b>Assay</b><span style={{ display: "block", fontFamily: mono, color: "#60706a", fontSize: 10 }}>post-execution mortgage QC</span></span>
    </button>
    <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {items.map(([id, label]) => {
        const selected = active === id;
        return <button key={id} type="button" onClick={() => navigate(id)} style={{ fontFamily: mono, border: `1px solid ${selected ? "#0d6259" : "#dfe6e2"}`, color: selected ? "#0d6259" : "#60706a", background: selected ? "#e4f0ee" : "#fff", borderRadius: 7, padding: "7px 10px", cursor: "pointer", fontSize: 11 }}>{label}</button>;
      })}
    </nav>
  </header>;
}

function goToWorkspace(screen = "dashboard") {
  window.location.assign(`/?workspace=${encodeURIComponent(screen)}`);
}

function WorkspaceEntry({ target = "dashboard" }) {
  useEffect(() => {
    if (target === "dashboard") return;

    const labels = { profiles: "Rule Profiles", governance: "AI Governance" };
    const expected = labels[target];
    if (!expected) return;

    const timer = window.setTimeout(() => {
      const button = Array.from(document.querySelectorAll(".assay-embedded-app button")).find((item) => item.textContent?.trim() === expected);
      button?.click();
      window.history.replaceState({}, "", `/?workspace=${encodeURIComponent(target)}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [target]);

  return <div className="assay-workspace-shell" style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    <style>{`.assay-embedded-app > div > header { display: none !important; }`}</style>
    <ProductHeader active={target} />
    <div className="assay-embedded-app"><UnifiedApp /></div>
  </div>;
}

function CaseEntry() {
  return <div className="assay-workspace-shell" style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    <style>{`.assay-embedded-app > div > header { display: none !important; }`}</style>
    <ProductHeader active="dashboard" />
    <div className="assay-embedded-app"><UnifiedApp /></div>
  </div>;
}

function LiveEntry({ mode = "note" }) {
  const isPackage = mode === "package";
  return <div className="assay-live-shell" style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    {!isPackage && <style>{`.assay-live-content > main > header { display: none !important; }`}</style>}
    <ProductHeader active="" />
    <div className="assay-live-content">
      <Suspense fallback={<div style={{ padding: 40, fontFamily: shellFont }}>Loading {isPackage ? "Package Intelligence" : "Live Analysis"}…</div>}>
        {isPackage ? <PackageAnalysis /> : <LiveAnalysis />}
      </Suspense>
    </div>
  </div>;
}

function EvaluationEntry() {
  return <div style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    <ProductHeader active="evaluation" />
    <Suspense fallback={<div style={{ padding: 40, fontFamily: shellFont }}>Loading Evaluation…</div>}><EvaluationScreen /></Suspense>
    <footer style={{ fontFamily: mono, textAlign: "center", color: "#60706a", fontSize: 10, padding: 24 }}>Layered AI-system evaluation · synthetic portfolio benchmarks</footer>
  </div>;
}

function HumanReviewEntry() {
  return <div style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    <ProductHeader active="human-review" />
    <Suspense fallback={<div style={{ padding: 40, fontFamily: shellFont }}>Loading Human Review…</div>}><HumanCorrectionDemo /></Suspense>
    <footer style={{ fontFamily: mono, textAlign: "center", color: "#60706a", fontSize: 10, padding: 24 }}>Human correction reruns deterministic controls · correction is not an override</footer>
  </div>;
}

function Root() {
  const params = new URLSearchParams(window.location.search);
  const isLive = window.location.pathname === "/live";
  const isPackage = window.location.pathname === "/package";
  const isEvaluation = window.location.pathname === "/evaluation";
  const isHumanReview = window.location.pathname === "/human-review";
  const hasCase = params.has("case");
  const workspace = params.get("workspace");

  if (isEvaluation) return <EvaluationEntry />;
  if (isHumanReview) return <HumanReviewEntry />;
  if (isPackage) return <LiveEntry mode="package" />;
  if (isLive) return <LiveEntry />;
  if (hasCase) return <CaseEntry />;
  if (workspace) return <WorkspaceEntry target={["dashboard", "profiles", "governance"].includes(workspace) ? workspace : "dashboard"} />;

  const navigate = (screen) => {
    if (screen === "overview") return;
    if (screen === "human-review") {
      window.location.assign("/human-review");
      return;
    }
    goToWorkspace(screen);
  };

  return <div style={{ minHeight: "100vh", background: "#f5f7f6" }}>
    <ProductHeader active="overview" />
    <OverviewScreen onNavigate={navigate} />
    <footer style={{ fontFamily: mono, textAlign: "center", color: "#60706a", fontSize: 10, padding: 24 }}>Assay · sample-data portfolio prototype · not legal or compliance advice</footer>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);