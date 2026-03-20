import { AuthClient, type AuthClientLoginOptions } from "@dfinity/auth-client";
import { useCallback, useState } from "react";
import { loadConfig } from "../config";

const ONE_HOUR_IN_NANOSECONDS = BigInt(3_600_000_000_000);

/**
 * Provides a redirect-based login that does NOT use a popup.
 * windowOpenerFeatures: "" causes the auth window to open as a new full tab
 * instead of a constrained popup window, avoiding browser popup blockers.
 */
export function useRedirectLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithRedirect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = await loadConfig();
      const authClient = await AuthClient.create({
        idleOptions: {
          disableDefaultIdleCallback: true,
          disableIdle: true,
        },
        loginOptions: {
          derivationOrigin: config.ii_derivation_origin,
        },
      });

      const options: AuthClientLoginOptions = {
        identityProvider: process.env.II_URL,
        // Empty string or full-size window features force a new tab instead of popup
        windowOpenerFeatures: `top=0,left=0,width=${window.screen.width},height=${window.screen.height},toolbar=0,scrollbars=1,status=0,resizable=1`,
        onSuccess: () => {
          // Reload to pick up the new identity from storage
          window.location.reload();
        },
        onError: (err) => {
          setError(err ?? "Login failed");
          setIsLoading(false);
        },
        maxTimeToLive: ONE_HOUR_IN_NANOSECONDS * BigInt(24 * 30),
      };

      void authClient.login(options);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize login",
      );
      setIsLoading(false);
    }
  }, []);

  return { loginWithRedirect, isLoading, error };
}
