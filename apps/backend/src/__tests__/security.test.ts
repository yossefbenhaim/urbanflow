/**
 * Security tests for Session 7 improvements:
 * - Input sanitization (XSS prevention)
 * - File upload validation (MIME type, size, extension, path traversal)
 * - Rate limiting configuration
 * - CORS configuration
 */
import { describe, it, expect } from 'vitest'
import {
  sanitizeString,
  sanitizeInput,
  escapeHtml,
  stripHtmlTags,
} from '../middleware/sanitize'
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  MAX_FILE_SIZE,
  validateFileUpload,
} from '../middleware/fileValidation'

// ── Input Sanitization ──────────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('removes script tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")')
  })

  it('removes all HTML tags', () => {
    expect(sanitizeString('<b>bold</b> <i>italic</i>')).toBe('bold italic')
  })

  it('removes javascript: protocol', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)')
  })

  it('removes vbscript: protocol', () => {
    expect(sanitizeString('vbscript:MsgBox(1)')).toBe('MsgBox(1)')
  })

  it('removes event handlers', () => {
    expect(sanitizeString('text onclick=alert(1)')).toBe('text alert(1)')
  })

  it('removes onerror handlers', () => {
    expect(sanitizeString('img onerror=alert(1)')).toBe('img alert(1)')
  })

  it('preserves normal Hebrew text', () => {
    expect(sanitizeString('שלום עולם')).toBe('שלום עולם')
  })

  it('preserves normal English text', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World')
  })

  it('preserves numbers and common punctuation', () => {
    expect(sanitizeString('Building 42, Floor 3')).toBe('Building 42, Floor 3')
  })

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('handles empty string', () => {
    expect(sanitizeString('')).toBe('')
  })

  it('removes nested script tags', () => {
    expect(sanitizeString('<scr<script>ipt>alert(1)</script>')).toBe('ipt>alert(1)')
  })

  it('removes data: protocol except data:image', () => {
    expect(sanitizeString('data:text/html,<h1>XSS</h1>')).toBe('text/html,XSS')
  })
})

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s")
  })
})

describe('stripHtmlTags', () => {
  it('removes all HTML tags', () => {
    expect(stripHtmlTags('<p>Hello <b>World</b></p>')).toBe('Hello World')
  })

  it('preserves text without tags', () => {
    expect(stripHtmlTags('no tags here')).toBe('no tags here')
  })
})

describe('sanitizeInput (deep)', () => {
  it('sanitizes nested object strings', () => {
    const input = {
      name: '<script>evil</script>John',
      address: {
        street: '<b>Main</b> St',
        city: 'Tel Aviv',
      },
    }
    const result = sanitizeInput(input) as typeof input
    expect(result.name).toBe('evilJohn')
    expect(result.address.street).toBe('Main St')
    expect(result.address.city).toBe('Tel Aviv')
  })

  it('sanitizes arrays of strings', () => {
    const input = ['<script>bad</script>', 'good', '<img onerror=x>']
    const result = sanitizeInput(input)
    expect(result[0]).toBe('bad')
    expect(result[1]).toBe('good')
    expect(result[2]).toBe('')
  })

  it('preserves numbers', () => {
    expect(sanitizeInput(42)).toBe(42)
  })

  it('preserves booleans', () => {
    expect(sanitizeInput(true)).toBe(true)
  })

  it('preserves null', () => {
    expect(sanitizeInput(null)).toBe(null)
  })

  it('preserves Date objects', () => {
    const date = new Date('2024-01-01')
    expect(sanitizeInput(date)).toBe(date)
  })

  it('handles mixed object with various types', () => {
    const input = {
      text: '<script>xss</script>',
      num: 5,
      bool: false,
      arr: ['<b>x</b>', 'y'],
      nested: { deep: '<img src=x onerror=alert(1)>' },
    }
    const result = sanitizeInput(input) as typeof input
    expect(result.text).toBe('xss')
    expect(result.num).toBe(5)
    expect(result.bool).toBe(false)
    expect(result.arr[0]).toBe('x')
    expect(result.nested.deep).toBe('')
  })
})

// ── File Upload Validation Constants ────────────────────────────────────────

describe('file upload validation config', () => {
  it('allows common document MIME types', () => {
    expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true)
    expect(ALLOWED_MIME_TYPES.has('application/msword')).toBe(true)
    expect(ALLOWED_MIME_TYPES.has('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })

  it('allows common image MIME types', () => {
    expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true)
    expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true)
    expect(ALLOWED_MIME_TYPES.has('image/webp')).toBe(true)
  })

  it('does not allow executable MIME types', () => {
    expect(ALLOWED_MIME_TYPES.has('application/x-executable')).toBe(false)
    expect(ALLOWED_MIME_TYPES.has('application/x-msdownload')).toBe(false)
  })

  it('allows common document extensions', () => {
    expect(ALLOWED_EXTENSIONS.has('.pdf')).toBe(true)
    expect(ALLOWED_EXTENSIONS.has('.docx')).toBe(true)
    expect(ALLOWED_EXTENSIONS.has('.xlsx')).toBe(true)
  })

  it('blocks dangerous file extensions', () => {
    expect(DANGEROUS_EXTENSIONS.has('.exe')).toBe(true)
    expect(DANGEROUS_EXTENSIONS.has('.bat')).toBe(true)
    expect(DANGEROUS_EXTENSIONS.has('.sh')).toBe(true)
    expect(DANGEROUS_EXTENSIONS.has('.php')).toBe(true)
    expect(DANGEROUS_EXTENSIONS.has('.js')).toBe(true)
  })

  it('has a reasonable max file size (10MB)', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
  })
})

// ── File Upload Validation Middleware ────────────────────────────────────────

describe('validateFileUpload middleware', () => {
  function createMockReq(overrides: Record<string, unknown> = {}) {
    return {
      headers: { 'content-type': 'application/pdf', 'content-length': '1000' },
      query: { path: 'project/doc.pdf' },
      body: Buffer.alloc(100),
      ...overrides,
    }
  }

  function createMockRes() {
    const res: Record<string, unknown> = {}
    res.status = (code: number) => { res._status = code; return res }
    res.json = (data: unknown) => { res._json = data; return res }
    return res as { status: (c: number) => typeof res; json: (d: unknown) => typeof res; _status?: number; _json?: unknown }
  }

  it('passes valid PDF upload', () => {
    const req = createMockReq()
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(true)
  })

  it('rejects missing path', () => {
    const req = createMockReq({ query: {} })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects path traversal with ..', () => {
    const req = createMockReq({ query: { path: '../etc/passwd' } })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects path traversal with //', () => {
    const req = createMockReq({ query: { path: 'project//hidden.pdf' } })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects path starting with /', () => {
    const req = createMockReq({ query: { path: '/absolute/path.pdf' } })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects dangerous file extensions (.exe)', () => {
    const req = createMockReq({ query: { path: 'project/malware.exe' } })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects dangerous file extensions (.sh)', () => {
    const req = createMockReq({ query: { path: 'project/script.sh' } })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects unsupported file extensions (.zip)', () => {
    const req = createMockReq({ query: { path: 'project/archive.zip' } })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects unsupported MIME types', () => {
    const req = createMockReq({
      headers: { 'content-type': 'application/x-executable', 'content-length': '1000' },
      query: { path: 'project/doc.pdf' },
    })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(400)
  })

  it('rejects oversized files based on content-length', () => {
    const req = createMockReq({
      headers: { 'content-type': 'application/pdf', 'content-length': String(11 * 1024 * 1024) },
      query: { path: 'project/doc.pdf' },
    })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(413)
  })

  it('rejects oversized body buffer', () => {
    const req = createMockReq({
      headers: { 'content-type': 'application/pdf', 'content-length': '100' },
      query: { path: 'project/doc.pdf' },
      body: Buffer.alloc(11 * 1024 * 1024),
    })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res._status).toBe(413)
  })

  it('allows valid image upload', () => {
    const req = createMockReq({
      headers: { 'content-type': 'image/jpeg', 'content-length': '5000' },
      query: { path: 'project/photo.jpg' },
    })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(true)
  })

  it('allows application/octet-stream MIME type (generic binary)', () => {
    const req = createMockReq({
      headers: { 'content-type': 'application/octet-stream', 'content-length': '1000' },
      query: { path: 'project/doc.pdf' },
    })
    const res = createMockRes()
    let nextCalled = false
    validateFileUpload(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(true)
  })
})
