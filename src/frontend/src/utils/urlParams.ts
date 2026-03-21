/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

/**
 * Extracts a URL parameter from the current URL
 * Works with both query strings (?param=value) and hash-based routing (#caffeineAdminToken=value)
 */
export function getUrlParameter(paramName: string): string | null {
  // Try regular query string first
  const urlParams = new URLSearchParams(window.location.search);
  const regularParam = urlParams.get(paramName);
  if (regularParam !== null) return regularParam;

  // Try direct hash parameter: #caffeineAdminToken=value
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1); // remove leading #
    const hashParams = new URLSearchParams(hashContent);
    const hashDirect = hashParams.get(paramName);
    if (hashDirect !== null) return hashDirect;

    // Also try hash with query string: #/?param=value or #/route?param=value
    const queryStartIndex = hashContent.indexOf("?");
    if (queryStartIndex !== -1) {
      const hashQuery = hashContent.substring(queryStartIndex + 1);
      const hashQueryParams = new URLSearchParams(hashQuery);
      const hashQueryParam = hashQueryParams.get(paramName);
      if (hashQueryParam !== null) return hashQueryParam;
    }
  }

  return null;
}

export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (_e) {
    /* ignore */
  }
}

export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

export function storeLocalParameter(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (_e) {
    /* ignore */
  }
}

export function getLocalParameter(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

export function getPersistedUrlParameter(
  paramName: string,
  storageKey?: string,
): string | null {
  const key = storageKey || paramName;
  const urlValue = getUrlParameter(paramName);
  if (urlValue !== null) {
    storeSessionParameter(key, urlValue);
    return urlValue;
  }
  return getSessionParameter(key);
}

export function clearSessionParameter(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (_e) {
    /* ignore */
  }
}

/**
 * Captures the admin token from URL at page load and persists to both
 * sessionStorage and localStorage so it survives sign-in redirects and
 * browser restarts. Call this once at the very top of main.tsx.
 */
export function captureAdminToken(paramName: string): void {
  const value = getUrlParameter(paramName);
  if (value) {
    storeSessionParameter(paramName, value);
    storeLocalParameter(paramName, value);
  }
}

/**
 * Gets a secret parameter with full fallback chain:
 * URL query string -> URL hash -> sessionStorage -> localStorage
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. Try URL (query string + hash)
  const urlValue = getUrlParameter(paramName);
  if (urlValue !== null) {
    storeSessionParameter(paramName, urlValue);
    storeLocalParameter(paramName, urlValue);
    return urlValue;
  }

  // 2. Try sessionStorage
  const sessionValue = getSessionParameter(paramName);
  if (sessionValue !== null) return sessionValue;

  // 3. Try localStorage (persists across browser restarts)
  const localValue = getLocalParameter(paramName);
  if (localValue !== null) {
    // Restore to sessionStorage for consistency
    storeSessionParameter(paramName, localValue);
    return localValue;
  }

  return null;
}

// Keep backward compat
export function getSecretFromHash(paramName: string): string | null {
  return getSecretParameter(paramName);
}
