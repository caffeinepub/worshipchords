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
 * Stores a parameter in localStorage for persistence across browser sessions
 */
export function storeLocalParameter(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to store local parameter ${key}:`, error);
  }
}

/**
 * Retrieves a parameter from localStorage
 */
export function getLocalParameter(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to retrieve local parameter ${key}:`, error);
    return null;
  }
}

/**
 * Gets a parameter from URL or sessionStorage (URL takes precedence)
 * If found in URL, also stores it in sessionStorage for future use
 */
export function getPersistedUrlParameter(
  paramName: string,
  storageKey?: string,
): string | null {
  const key = storageKey || paramName;

  // Check URL first
  const urlValue = getUrlParameter(paramName);
  if (urlValue !== null) {
    storeSessionParameter(key, urlValue);
    return urlValue;
  }

  // Fall back to session storage
  return getSessionParameter(key);
}

/**
 * Removes a parameter from sessionStorage
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
 * Gets a secret from the URL hash fragment only
 */
export function getSecretFromHash(paramName: string): string | null {
  // Check localStorage first for cross-session persistence
  const localSecret = getLocalParameter(paramName);
  if (localSecret !== null) {
    return localSecret;
  }

  // Check sessionStorage
  const sessionSecret = getSessionParameter(paramName);
  if (sessionSecret !== null) {
    return sessionSecret;
  }

  // Try to extract from hash
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return null;
  }

  const hashContent = hash.substring(1);
  const params = new URLSearchParams(hashContent);
  const secret = params.get(paramName);

  if (secret) {
    storeLocalParameter(paramName, secret);
    storeSessionParameter(paramName, secret);
    clearParamFromHash(paramName);
    return secret;
  }

  return null;
}

/**
 * Gets a secret parameter with fallback chain:
 * query string -> hash -> localStorage -> sessionStorage
 *
 * If found in URL (query or hash), saves to BOTH localStorage AND sessionStorage
 * so it persists across browser sessions without needing the admin link again.
 *
 * @param paramName - The name of the secret parameter
 * @returns The secret value if found, null otherwise
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. Check query string first (Caffeine delivers token here)
  const urlParams = new URLSearchParams(window.location.search);
  const queryValue = urlParams.get(paramName);
  if (queryValue !== null) {
    storeLocalParameter(paramName, queryValue);
    storeSessionParameter(paramName, queryValue);
    return queryValue;
  }

  // 2. Check hash
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1);
    const hashParams = new URLSearchParams(hashContent);
    const hashValue = hashParams.get(paramName);
    if (hashValue !== null) {
      storeLocalParameter(paramName, hashValue);
      storeSessionParameter(paramName, hashValue);
      clearParamFromHash(paramName);
      return hashValue;
    }
  }

  // 3. Check localStorage (persists across sessions)
  const localValue = getLocalParameter(paramName);
  if (localValue !== null) {
    return localValue;
  }

  // 4. Check sessionStorage (current session fallback)
  return getSessionParameter(paramName);
}
