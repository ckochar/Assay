import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import UnifiedApp from "./UnifiedApp.jsx";

const LiveAnalysis = lazy(() => import("./LiveAnalysis.jsx"));

function Root() {
  const isLive = window.location.pathname === "/live";
  return isLive ? (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>Loading Live Analysis…</div>}>
      <LiveAnalysis />
    </Suspense>
  ) : <UnifiedApp />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
