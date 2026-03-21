/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

/**
 * Extracts a URL parameter from the current URL.
 * Checks: regular query string -> hash query string -> bare hash fragment.
 */
export function getUrlParameter(paramName: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const regularParam = urlParams.get(paramName);
  if (regularParam !== null) return regularParam;

  const hash = window.location.hash;
  const queryStartIndex = hash.indexOf("?");
  if (queryStartIndex !== -1) {
    const hashQuery = hash.substring(queryStartIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    const hashQVal = hashParams.get(paramName);
    if (hashQVal !== null) return hashQVal;
  }

  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1);
    const hashParams = new URLSearchParams(hashContent);
    const hashVal = hashParams.get(paramName);
    if (hashVal !== null) return hashVal;
  }

  return null;
}

export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to store session parameter ${key}:`, error);
  }
}

export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to retrieve session parameter ${key}:`, error);
    return null;
  }
}

/**
 * Gets a parameter from URL or sessionStorage (URL takes precedence).
 * Saves to sessionStorage when found in URL so it persists across redirects.
 */
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
  } catch (error) {
    console.warn(`Failed to clear session parameter ${key}:`, error);
  }
}

/**
 * Gets a secret parameter - checks query params, hash, AND sessionStorage.
 * This is the correct way to read caffeineAdminToken which Caffeine delivers
 * as a regular query parameter (?caffeineAdminToken=...).
 */
export function getSecretParameter(paramName: string): string | null {
  return getPersistedUrlParameter(paramName);
}

/** Legacy alias kept for compatibility. */
export function getSecretFromHash(paramName: string): string | null {
  return getSecretParameter(paramName);
}
