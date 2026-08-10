import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

const LiveAnalysis = lazy(() => import("./LiveAnalysis.jsx"));

function Root() {
  const isLive = window.location.pathname === "/live";
  return (
    <>
      {!isLive && (
        <a
          href="/live"
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 100,
            background: "#0d6259",
            color: "white",
            borderRadius: 999,
            padding: "10px 14px",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 800,
            textDecoration: "none",
            boxShadow: "0 8px 24px #0d625944",
          }}
        >
          Try live PDF analysis
        </a>
      )}
      {isLive ? (
        <Suspense fallback={<div style={{ padding: 40, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>Loading live document workspace…</div>}>
          <LiveAnalysis />
        </Suspense>
      ) : <App />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
