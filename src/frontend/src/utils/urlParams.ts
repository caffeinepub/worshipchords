/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

/**
 * Extracts a URL parameter from the current URL
 * Works with both query strings (?param=value) and hash-based routing (#/?param=value)
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

function clearParamFromHash(paramName: string): void {
  if (!window.history.replaceState) return;
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return;
  const hashContent = hash.substring(1);
  const queryStartIndex = hashContent.indexOf("?");
  if (queryStartIndex === -1) return;
  const routePath = hashContent.substring(0, queryStartIndex);
  const queryString = hashContent.substring(queryStartIndex + 1);
  const params = new URLSearchParams(queryString);
  params.delete(paramName);
  const newQueryString = params.toString();
  let newHash = routePath;
  if (newQueryString) newHash += `?${newQueryString}`;
  const newUrl =
    window.location.pathname +
    window.location.search +
    (newHash ? `#${newHash}` : "");
  window.history.replaceState(null, "", newUrl);
}

export function getSecretFromHash(paramName: string): string | null {
  const existingSecret = getSessionParameter(paramName);
  if (existingSecret !== null) return existingSecret;

  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return null;
  const hashContent = hash.substring(1);
  const params = new URLSearchParams(hashContent);
  const secret = params.get(paramName);
  if (secret) {
    storeSessionParameter(paramName, secret);
    clearParamFromHash(paramName);
    return secret;
  }
  return null;
}

/**
 * Gets a secret parameter with fallback chain:
 * 1. Regular query string (?param=value)  -- Caffeine admin link format
 * 2. URL hash fragment
 * 3. sessionStorage (persisted across redirects)
 *
 * The value is saved to sessionStorage on first read so it survives sign-in redirects.
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. Check regular query string first (Caffeine delivers caffeineAdminToken here)
  const urlParams = new URLSearchParams(window.location.search);
  const queryValue = urlParams.get(paramName);
  if (queryValue !== null) {
    storeSessionParameter(paramName, queryValue);
    return queryValue;
  }

  // 2. Check hash fragment
  const hashValue = getSecretFromHash(paramName);
  if (hashValue !== null) return hashValue;

  // 3. Fall back to sessionStorage (token captured before sign-in redirect)
  return getSessionParameter(paramName);
}
