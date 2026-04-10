import type { Request, Response, NextFunction } from 'express'

/** Allowed MIME types for file uploads */
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Text
  'text/plain',
  'text/csv',
])

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.txt', '.csv',
])

/** Maximum file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Dangerous file extensions that should always be rejected */
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.mjs',
  '.php', '.py', '.rb', '.pl', '.jar', '.war', '.dll', '.so',
  '.com', '.scr', '.pif', '.msi', '.wsf', '.hta',
])

/**
 * Validates file uploads by checking:
 * - MIME type against allowlist
 * - File extension against allowlist and blocklist
 * - File size against maximum
 * - Path traversal attempts
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'] || ''
  const path = req.query.path as string

  // Check path exists
  if (!path) {
    res.status(400).json({ error: 'No path provided' })
    return
  }

  // Check for path traversal
  if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
    res.status(400).json({ error: 'Invalid file path' })
    return
  }

  // Check file extension
  const ext = getExtension(path)
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    res.status(400).json({ error: `סוג קובץ לא מורשה: ${ext}` })
    return
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    res.status(400).json({ error: `סיומת קובץ לא נתמכת: ${ext}` })
    return
  }

  // Check MIME type (extract base MIME without parameters)
  const baseMime = contentType.split(';')[0].trim().toLowerCase()
  if (baseMime && baseMime !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.has(baseMime)) {
    res.status(400).json({ error: `סוג MIME לא נתמך: ${baseMime}` })
    return
  }

  // Check file size
  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > MAX_FILE_SIZE) {
    res.status(413).json({ error: `קובץ גדול מדי. מקסימום ${MAX_FILE_SIZE / 1024 / 1024}MB` })
    return
  }

  // Also check actual body size if available
  if (req.body && Buffer.isBuffer(req.body) && req.body.length > MAX_FILE_SIZE) {
    res.status(413).json({ error: `קובץ גדול מדי. מקסימום ${MAX_FILE_SIZE / 1024 / 1024}MB` })
    return
  }

  next()
}

function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filePath.slice(lastDot).toLowerCase()
}

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, DANGEROUS_EXTENSIONS, MAX_FILE_SIZE }
