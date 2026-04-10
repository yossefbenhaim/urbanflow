/**
 * Server-side input sanitization against XSS attacks.
 * Strips HTML tags and encodes dangerous characters from string inputs.
 */

/** Characters that need HTML entity encoding */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

const HTML_ENTITY_REGEX = /[&<>"'/]/g

/**
 * Escape HTML entities in a string to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Remove potentially dangerous patterns from strings:
 * - javascript: protocol
 * - data: protocol (except data:image for legitimate images)
 * - event handlers (onclick, onerror, etc.)
 * - script tags
 */
export function sanitizeString(str: string): string {
  let sanitized = str
  // Remove javascript: and vbscript: protocols
  sanitized = sanitized.replace(/javascript\s*:/gi, '')
  sanitized = sanitized.replace(/vbscript\s*:/gi, '')
  // Remove data: protocol (except data:image which may be legitimate)
  sanitized = sanitized.replace(/data\s*:(?!image\/)/gi, '')
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  // Strip HTML tags
  sanitized = stripHtmlTags(sanitized)
  return sanitized.trim()
}

/**
 * Deep sanitize an object: recursively sanitize all string values.
 * Preserves structure, only modifies string leaf values.
 */
export function sanitizeInput<T>(input: T): T {
  if (typeof input === 'string') {
    return sanitizeString(input) as T
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput) as T
  }
  if (input !== null && typeof input === 'object' && !(input instanceof Date)) {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized as T
  }
  return input
}
