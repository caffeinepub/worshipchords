/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

/**
 * Extracts a URL parameter from the current URL
 * Works with both query strings (?param=value) and hash-based routing (#/?param=value)
 */
export function getUrlParameter(paramName: string): string | null {
  // Try regular query string first
  const urlParams = new URLSearchParams(window.location.search);
  const regularParam = urlParams.get(paramName);
  if (regularParam !== null) return regularParam;

  // Try hash fragment
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1);
    // Support both #param=value and #/route?param=value
    const queryStartIndex = hashContent.indexOf("?");
    const hashQuery =
      queryStartIndex !== -1
        ? hashContent.substring(queryStartIndex + 1)
        : hashContent;
    const hashParams = new URLSearchParams(hashQuery);
    const hashVal = hashParams.get(paramName);
    if (hashVal !== null) return hashVal;
  }

  return null;
}

export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (_) {}
}

export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (_) {
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
  } catch (_) {}
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

/**
 * Gets a secret parameter using a four-source fallback chain:
 *   URL query string → URL hash → sessionStorage → localStorage
 *
 * If found in URL, saves to both sessionStorage AND localStorage
 * so the token survives sign-in redirects (sessionStorage wipe)
 * and browser restarts (sessionStorage wipe).
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. sessionStorage (fastest, already captured at page load)
  try {
    const ss = sessionStorage.getItem(paramName);
    if (ss) return ss;
  } catch (_) {}

  // 2. localStorage (survives browser restarts)
  try {
    const ls = localStorage.getItem(paramName);
    if (ls) {
      // Refresh sessionStorage so future calls are fast
      try {
        sessionStorage.setItem(paramName, ls);
      } catch (_) {}
      return ls;
    }
  } catch (_) {}

  // 3. URL query string (?caffeineAdminToken=...)
  const qp = new URLSearchParams(window.location.search);
  const qpVal = qp.get(paramName);
  if (qpVal) {
    try {
      sessionStorage.setItem(paramName, qpVal);
    } catch (_) {}
    try {
      localStorage.setItem(paramName, qpVal);
    } catch (_) {}
    return qpVal;
  }

  // 4. URL hash (#caffeineAdminToken=... or #/route?caffeineAdminToken=...)
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1);
    // Try direct key=value in hash
    const directParams = new URLSearchParams(hashContent);
    const directVal = directParams.get(paramName);
    if (directVal) {
      try {
        sessionStorage.setItem(paramName, directVal);
      } catch (_) {}
      try {
        localStorage.setItem(paramName, directVal);
      } catch (_) {}
      clearParamFromHash(paramName);
      return directVal;
    }
    // Try query portion of hash (#/route?key=value)
    const qIdx = hashContent.indexOf("?");
    if (qIdx !== -1) {
      const hashQp = new URLSearchParams(hashContent.substring(qIdx + 1));
      const hashQpVal = hashQp.get(paramName);
      if (hashQpVal) {
        try {
          sessionStorage.setItem(paramName, hashQpVal);
        } catch (_) {}
        try {
          localStorage.setItem(paramName, hashQpVal);
        } catch (_) {}
        clearParamFromHash(paramName);
        return hashQpVal;
      }
    }
  }

  return null;
}

/** @deprecated use getSecretParameter instead */
export function getSecretFromHash(paramName: string): string | null {
  return getSecretParameter(paramName);
}
