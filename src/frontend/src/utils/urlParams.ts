/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

/**
 * Extracts a URL parameter from the current URL
 * Works with both query strings (?param=value) and hash-based routing (#/?param=value)
 *
 * @param paramName - The name of the parameter to extract
 * @returns The parameter value if found, null otherwise
 */
export function getUrlParameter(paramName: string): string | null {
  // Try to get from regular query string first
  const urlParams = new URLSearchParams(window.location.search);
  const regularParam = urlParams.get(paramName);

  if (regularParam !== null) {
    return regularParam;
  }

  // If not found, try to extract from hash (for hash-based routing)
  const hash = window.location.hash;
  const queryStartIndex = hash.indexOf("?");

  if (queryStartIndex !== -1) {
    const hashQuery = hash.substring(queryStartIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    return hashParams.get(paramName);
  }

  return null;
}

/**
 * Stores a parameter in sessionStorage for persistence across navigation
 * Useful for maintaining state like admin tokens throughout the session
 *
 * @param key - The key to store the value under
 * @param value - The value to store
 */
export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to store session parameter ${key}:`, error);
  }
}

/**
 * Retrieves a parameter from sessionStorage
 *
 * @param key - The key to retrieve
 * @returns The stored value if found, null otherwise
 */
export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to retrieve session parameter ${key}:`, error);
    return null;
  }
}

/**
 * Gets a parameter from URL or sessionStorage (URL takes precedence)
 * If found in URL, also stores it in sessionStorage for future use
 *
 * @param paramName - The name of the parameter to retrieve
 * @param storageKey - Optional custom storage key (defaults to paramName)
 * @returns The parameter value if found, null otherwise
 */
export function getPersistedUrlParameter(
  paramName: string,
  storageKey?: string,
): string | null {
  const key = storageKey || paramName;

  // Check URL first
  const urlValue = getUrlParameter(paramName);
  if (urlValue !== null) {
    // Store in session for persistence
    storeSessionParameter(key, urlValue);
    return urlValue;
  }

  // Fall back to session storage
  return getSessionParameter(key);
}

/**
 * Removes a parameter from sessionStorage
 *
 * @param key - The key to remove
 */
export function clearSessionParameter(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear session parameter ${key}:`, error);
  }
}

/**
 * Removes a specific parameter from the URL hash without reloading the page
 */
function clearParamFromHash(paramName: string): void {
  if (!window.history.replaceState) {
    return;
  }

  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return;
  }

  const hashContent = hash.substring(1);
  const queryStartIndex = hashContent.indexOf("?");

  if (queryStartIndex === -1) {
    return;
  }

  const routePath = hashContent.substring(0, queryStartIndex);
  const queryString = hashContent.substring(queryStartIndex + 1);

  const params = new URLSearchParams(queryString);
  params.delete(paramName);

  const newQueryString = params.toString();
  let newHash = routePath;

  if (newQueryString) {
    newHash += `?${newQueryString}`;
  }

  const newUrl =
    window.location.pathname +
    window.location.search +
    (newHash ? `#${newHash}` : "");
  window.history.replaceState(null, "", newUrl);
}

/**
 * Gets a secret parameter with fallback chain:
 * sessionStorage -> localStorage -> URL hash -> URL query string
 *
 * @param paramName - The name of the secret parameter
 * @returns The secret value if found, null otherwise
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. sessionStorage (fastest, set during this session)
  try {
    const ss = sessionStorage.getItem(paramName);
    if (ss) return ss;
  } catch {}

  // 2. localStorage (persists across sessions/redirects)
  try {
    const ls = localStorage.getItem(paramName);
    if (ls) {
      // Restore to sessionStorage for faster future reads
      try {
        sessionStorage.setItem(paramName, ls);
      } catch {}
      return ls;
    }
  } catch {}

  // 3. URL hash (#paramName=value or #/route?paramName=value)
  try {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashContent = hash.substring(1);
      const directParams = new URLSearchParams(hashContent);
      const fromDirect = directParams.get(paramName);
      if (fromDirect) {
        try {
          sessionStorage.setItem(paramName, fromDirect);
        } catch {}
        try {
          localStorage.setItem(paramName, fromDirect);
        } catch {}
        clearParamFromHash(paramName);
        return fromDirect;
      }
      const qIdx = hashContent.indexOf("?");
      if (qIdx !== -1) {
        const hashQS = new URLSearchParams(hashContent.substring(qIdx + 1));
        const fromHashQS = hashQS.get(paramName);
        if (fromHashQS) {
          try {
            sessionStorage.setItem(paramName, fromHashQS);
          } catch {}
          try {
            localStorage.setItem(paramName, fromHashQS);
          } catch {}
          clearParamFromHash(paramName);
          return fromHashQS;
        }
      }
    }
  } catch {}

  // 4. URL query string (?paramName=value)
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQS = qs.get(paramName);
    if (fromQS) {
      try {
        sessionStorage.setItem(paramName, fromQS);
      } catch {}
      try {
        localStorage.setItem(paramName, fromQS);
      } catch {}
      return fromQS;
    }
  } catch {}

  return null;
}

/**
 * Gets a secret from the URL hash fragment only (more secure than query params)
 * @deprecated Use getSecretParameter instead
 */
export function getSecretFromHash(paramName: string): string | null {
  return getSecretParameter(paramName);
}
