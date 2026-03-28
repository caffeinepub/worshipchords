import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "./index.css";

// Capture admin token at absolute first opportunity, before any redirect can strip it
(function captureAdminToken() {
  const KEY = "caffeineAdminToken";
  try {
    // Check URL query string (?caffeineAdminToken=...)
    const qs = new URLSearchParams(window.location.search);
    const fromQS = qs.get(KEY);
    // Check URL hash (#caffeineAdminToken=... or #/route?caffeineAdminToken=...)
    const hash = window.location.hash;
    let fromHash: string | null = null;
    if (hash && hash.length > 1) {
      const hashContent = hash.substring(1);
      // Try direct hash params: #caffeineAdminToken=xxx
      const directParams = new URLSearchParams(hashContent);
      fromHash = directParams.get(KEY);
      // Try hash query string: #/route?caffeineAdminToken=xxx
      if (!fromHash) {
        const qIdx = hashContent.indexOf("?");
        if (qIdx !== -1) {
          const hashQS = new URLSearchParams(hashContent.substring(qIdx + 1));
          fromHash = hashQS.get(KEY);
        }
      }
    }
    const token = fromQS || fromHash;
    if (token) {
      try {
        sessionStorage.setItem(KEY, token);
      } catch {}
      try {
        localStorage.setItem(KEY, token);
      } catch {}
    }
  } catch {}
})();

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
