import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyListProvider } from "./components/familyflix/my-list-provider";

import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FamilyFlix App Crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: "#fff", background: "#100b13", minHeight: "100vh", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>FamilyFlix Encountered an Issue</h1>
          <p style={{ color: "#aaa", marginBottom: 20 }}>{this.state.error.message}</p>
          <pre style={{ background: "#1b1424", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 13, color: "#e88" }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: "10px 20px", background: "#6d28ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MyListProvider>
          <App />
        </MyListProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
