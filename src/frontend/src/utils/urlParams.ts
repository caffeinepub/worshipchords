/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
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
  // Check sessionStorage first
  try {
    const ss = sessionStorage.getItem(paramName);
    if (ss) return ss;
  } catch (_) {}
  // Check localStorage
  try {
    const ls = localStorage.getItem(paramName);
    if (ls) {
      try {
        sessionStorage.setItem(paramName, ls);
      } catch (_) {}
      return ls;
    }
  } catch (_) {}
  // Try hash
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return null;
  const hashContent = hash.substring(1);
  const params = new URLSearchParams(hashContent);
  const secret = params.get(paramName);
  if (secret) {
    try {
      sessionStorage.setItem(paramName, secret);
    } catch (_) {}
    try {
      localStorage.setItem(paramName, secret);
    } catch (_) {}
    clearParamFromHash(paramName);
    return secret;
  }
  return null;
}

/**
 * Gets a secret parameter checking all 4 sources:
 * sessionStorage -> localStorage -> URL query string -> URL hash
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. sessionStorage (set at page load before redirects)
  try {
    const ss = sessionStorage.getItem(paramName);
    if (ss) return ss;
  } catch (_) {}
  // 2. localStorage (persists across sessions)
  try {
    const ls = localStorage.getItem(paramName);
    if (ls) {
      try {
        sessionStorage.setItem(paramName, ls);
      } catch (_) {}
      return ls;
    }
  } catch (_) {}
  // 3. URL query string
  try {
    const qp = new URLSearchParams(window.location.search).get(paramName);
    if (qp) {
      try {
        sessionStorage.setItem(paramName, qp);
      } catch (_) {}
      try {
        localStorage.setItem(paramName, qp);
      } catch (_) {}
      return qp;
    }
  } catch (_) {}
  // 4. URL hash
  try {
    const hash = window.location.hash;
    if (hash) {
      const hashContent = hash.startsWith("#") ? hash.slice(1) : hash;
      const hp = new URLSearchParams(hashContent).get(paramName);
      if (hp) {
        try {
          sessionStorage.setItem(paramName, hp);
        } catch (_) {}
        try {
          localStorage.setItem(paramName, hp);
        } catch (_) {}
        return hp;
      }
      const qIdx = hashContent.indexOf("?");
      if (qIdx !== -1) {
        const hqp = new URLSearchParams(hashContent.slice(qIdx + 1)).get(
          paramName,
        );
        if (hqp) {
          try {
            sessionStorage.setItem(paramName, hqp);
          } catch (_) {}
          try {
            localStorage.setItem(paramName, hqp);
          } catch (_) {}
          return hqp;
        }
      }
    }
  } catch (_) {}
  return null;
}
