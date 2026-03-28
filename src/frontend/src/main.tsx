// MUST RUN FIRST: capture admin token from URL before React loads or redirects wipe it
(() => {
  const TOKEN_KEY = "caffeineAdminToken";
  const urlParams = new URLSearchParams(window.location.search);
  let token = urlParams.get(TOKEN_KEY);
  if (!token) {
    const hash = window.location.hash;
    if (hash) {
      const hashContent = hash.startsWith("#") ? hash.slice(1) : hash;
      const hashParams = new URLSearchParams(hashContent);
      token = hashParams.get(TOKEN_KEY);
      if (!token) {
        const qIdx = hashContent.indexOf("?");
        if (qIdx !== -1) {
          const hashQuery = new URLSearchParams(hashContent.slice(qIdx + 1));
          token = hashQuery.get(TOKEN_KEY);
        }
      }
    }
  }
  if (token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (_) {}
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (_) {}
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
