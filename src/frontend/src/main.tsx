// ============================================================
// CRITICAL: Capture admin token at the very first moment,
// before React mounts and before any sign-in redirect.
// This runs synchronously so the token survives cross-origin
// redirects that wipe sessionStorage.
// ============================================================
(function captureAdminToken() {
  const KEY = "caffeineAdminToken";
  try {
    // 1. Try URL query string  (?caffeineAdminToken=...)
    const qp = new URLSearchParams(window.location.search);
    let token: string | null = qp.get(KEY);

    // 2. Try URL hash  (#caffeineAdminToken=...)
    if (!token && window.location.hash && window.location.hash.length > 1) {
      const hashContent = window.location.hash.substring(1);
      const hp = new URLSearchParams(hashContent);
      token = hp.get(KEY);
    }

    if (token) {
      // Persist to BOTH storages so it survives redirects and restarts
      sessionStorage.setItem(KEY, token);
      localStorage.setItem(KEY, token);
    }
  } catch (_) {
    // Storage may be blocked in some browsers; silent fail is acceptable
  }
})();

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
