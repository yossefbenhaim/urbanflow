import DOMPurify from 'dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous tags and attributes.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span', 'div', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'dir'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize plain text input - strips all HTML tags.
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Sanitize a URL - only allow http, https, and mailto protocols.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed
  }
  return ''
}
