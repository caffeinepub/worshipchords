/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

const LS_PREFIX = "wc_secret_";

function lsKey(paramName: string): string {
  return LS_PREFIX + paramName;
}

/** Save to both sessionStorage and localStorage */
function persistSecret(paramName: string, value: string): void {
  try {
    sessionStorage.setItem(paramName, value);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(lsKey(paramName), value);
  } catch {
    /* ignore */
  }
}

/** Read from sessionStorage first, then localStorage */
function readPersistedSecret(paramName: string): string | null {
  try {
    const ss = sessionStorage.getItem(paramName);
    if (ss) return ss;
  } catch {
    /* ignore */
  }
  try {
    const ls = localStorage.getItem(lsKey(paramName));
    if (ls) return ls;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Gets a secret parameter checking all sources:
 * URL query string → URL hash → sessionStorage → localStorage
 * When found in URL, saves to both storages for persistence.
 */
export function getSecretParameter(paramName: string): string | null {
  // 1. Check URL query string
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const qsVal = urlParams.get(paramName);
    if (qsVal) {
      persistSecret(paramName, qsVal);
      return qsVal;
    }
  } catch {
    /* ignore */
  }

  // 2. Check URL hash (handles #paramName=value or #/path?paramName=value)
  try {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashContent = hash.substring(1);
      // Try direct hash params: #paramName=value
      const directParams = new URLSearchParams(hashContent);
      const directVal = directParams.get(paramName);
      if (directVal) {
        persistSecret(paramName, directVal);
        return directVal;
      }
      // Try hash query string: #/path?paramName=value
      const qsi = hashContent.indexOf("?");
      if (qsi !== -1) {
        const hashQs = new URLSearchParams(hashContent.substring(qsi + 1));
        const hashQsVal = hashQs.get(paramName);
        if (hashQsVal) {
          persistSecret(paramName, hashQsVal);
          return hashQsVal;
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Fall back to stored values
  return readPersistedSecret(paramName);
}

// -- Legacy helpers kept for compatibility --

export function getUrlParameter(paramName: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const v = urlParams.get(paramName);
  if (v !== null) return v;
  const hash = window.location.hash;
  const qi = hash.indexOf("?");
  if (qi !== -1) {
    return new URLSearchParams(hash.substring(qi + 1)).get(paramName);
  }
  return null;
}

export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
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
  } catch {
    /* ignore */
  }
}

export function getSecretFromHash(paramName: string): string | null {
  return getSecretParameter(paramName);
}
