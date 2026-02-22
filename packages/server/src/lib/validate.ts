/**
 * Input validation helpers.
 *
 * Sanitize and validate all user input to prevent injection attacks.
 */

/** Max length for string inputs */
const MAX_STRING_LENGTH = 500;

/** Allowed characters for provider keys and connection IDs */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_\-.:]+$/;

/**
 * Validate a provider key (e.g. "github", "linear").
 */
export function validateProviderKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  if (key.length === 0 || key.length > 50) return null;
  if (!SAFE_ID_PATTERN.test(key)) return null;
  return key;
}

/**
 * Validate a connection ID (app-defined user identifier).
 */
export function validateConnectionId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  if (id.length === 0 || id.length > 200) return null;
  if (!SAFE_ID_PATTERN.test(id)) return null;
  return id;
}

/**
 * Validate a redirect URI.
 * Must be a valid URL (http, https, or custom scheme for mobile).
 */
export function validateRedirectUri(uri: unknown): string | null {
  if (uri === undefined || uri === null) return null;
  if (typeof uri !== 'string') return null;
  if (uri.length > MAX_STRING_LENGTH) return null;

  try {
    const url = new URL(uri);
    // Block javascript: and data: URIs
    if (url.protocol === 'javascript:' || url.protocol === 'data:') {
      return null;
    }
    return uri;
  } catch {
    return null;
  }
}

/**
 * Validate a generic string input.
 */
export function validateString(
  value: unknown,
  maxLength: number = MAX_STRING_LENGTH,
): string | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0 || value.length > maxLength) return null;
  return value;
}
