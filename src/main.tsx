import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#18181b",
          color: "#f4f4f5",
          padding: "2.5rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            backgroundColor: "#27272a",
            borderRadius: "1rem",
            padding: "2rem",
            border: "1px solid #3f3f46",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f43f5e", marginBottom: "0.75rem" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#a1a1aa", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Laya encountered an unexpected UI error.
            </p>
            <div style={{
              backgroundColor: "#09090b",
              borderRadius: "0.5rem",
              padding: "1rem",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              color: "#fb7185",
              overflowX: "auto",
              marginBottom: "1.5rem"
            }}>
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#e11d48",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.875rem",
                padding: "0.625rem 1.25rem",
                borderRadius: "0.75rem",
                border: "none",
                cursor: "pointer"
              }}
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const isMiniTimer =
  typeof window !== "undefined" &&
  (window.location.search.indexOf("window=mini-timer") !== -1 ||
    window.location.hash.indexOf("window=mini-timer") !== -1);

if (isMiniTimer) {
  try {
    const savedTheme = localStorage.getItem("laya_theme") || "default";
    import("./lib/theme").then(({ applyTheme }) => {
      applyTheme(savedTheme);
    });
  } catch {
    // Ignore theme initialization error
  }
} else {
  document.documentElement.classList.remove("dark");
}

const loadingEl = document.getElementById("laya-loading");
if (loadingEl) {
  loadingEl.remove();
}

const MiniTimerWidget = isMiniTimer
  ? React.lazy(() => import("./components/focus/MiniTimerWidget"))
  : null;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isMiniTimer && MiniTimerWidget ? (
        <React.Suspense fallback={null}>
          <MiniTimerWidget />
        </React.Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);