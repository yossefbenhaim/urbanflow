import { describe, it, expect } from 'vitest'
import {
  fillTemplate,
  buildVariablesFromProfile,
  getRequiredFields,
  getUnfilledFields,
  normalizePlaceholderName,
  resolveTemplatePlaceholders,
} from '../utils/templateRenderer'

describe('templateRenderer', () => {
  // ── fillTemplate ──────────────────────────────────────
  describe('fillTemplate', () => {
    it('replaces English placeholders', () => {
      const result = fillTemplate('שלום {{fullName}}, ת.ז. {{idNumber}}', {
        fullName: 'ישראל ישראלי',
        idNumber: '123456789',
      })
      expect(result).toBe('שלום ישראל ישראלי, ת.ז. 123456789')
    })

    it('replaces Hebrew placeholders', () => {
      const result = fillTemplate('שלום {{שם_מלא}}, טלפון {{טלפון}}', {
        fullName: 'ישראל ישראלי',
        phone: '0501234567',
      })
      expect(result).toBe('שלום ישראל ישראלי, טלפון 0501234567')
    })

    it('keeps unresolved placeholders as-is', () => {
      const result = fillTemplate('שם: {{fullName}}, כתובת: {{address}}', {
        fullName: 'ישראל',
      })
      expect(result).toBe('שם: ישראל, כתובת: {{address}}')
    })

    it('handles empty data', () => {
      const template = '{{fullName}} - {{idNumber}}'
      const result = fillTemplate(template, {})
      expect(result).toBe(template)
    })

    it('handles template with no placeholders', () => {
      const result = fillTemplate('טקסט רגיל', { fullName: 'test' })
      expect(result).toBe('טקסט רגיל')
    })
  })

  // ── getRequiredFields ─────────────────────────────────
  describe('getRequiredFields', () => {
    it('extracts English field names', () => {
      const fields = getRequiredFields('{{fullName}} {{idNumber}} {{email}}')
      expect(fields).toEqual(expect.arrayContaining(['fullName', 'idNumber', 'email']))
      expect(fields).toHaveLength(3)
    })

    it('normalizes Hebrew field names to English', () => {
      const fields = getRequiredFields('{{שם_מלא}} {{תעודת_זהות}}')
      expect(fields).toContain('fullName')
      expect(fields).toContain('idNumber')
    })

    it('deduplicates fields', () => {
      const fields = getRequiredFields('{{fullName}} and {{fullName}} again')
      expect(fields.filter((f) => f === 'fullName')).toHaveLength(1)
    })

    it('returns empty array for no placeholders', () => {
      expect(getRequiredFields('no placeholders here')).toEqual([])
    })
  })

  // ── getUnfilledFields ─────────────────────────────────
  describe('getUnfilledFields', () => {
    it('returns fields missing from data', () => {
      const unfilled = getUnfilledFields('{{fullName}} {{idNumber}} {{email}}', {
        fullName: 'test',
      })
      expect(unfilled).toEqual(expect.arrayContaining(['idNumber', 'email']))
      expect(unfilled).not.toContain('fullName')
    })

    it('returns empty array when all fields filled', () => {
      const unfilled = getUnfilledFields('{{fullName}}', { fullName: 'test' })
      expect(unfilled).toEqual([])
    })
  })

  // ── normalizePlaceholderName ──────────────────────────
  describe('normalizePlaceholderName', () => {
    it('maps Hebrew to English', () => {
      expect(normalizePlaceholderName('שם_מלא')).toBe('fullName')
      expect(normalizePlaceholderName('תעודת_זהות')).toBe('idNumber')
      expect(normalizePlaceholderName('טלפון')).toBe('phone')
      expect(normalizePlaceholderName('אימייל')).toBe('email')
    })

    it('returns English names unchanged', () => {
      expect(normalizePlaceholderName('fullName')).toBe('fullName')
      expect(normalizePlaceholderName('idNumber')).toBe('idNumber')
    })

    it('returns unknown names unchanged', () => {
      expect(normalizePlaceholderName('unknownField')).toBe('unknownField')
    })
  })

  // ── resolveTemplatePlaceholders ───────────────────────
  describe('resolveTemplatePlaceholders', () => {
    it('returns resolved text and unresolved fields', () => {
      const result = resolveTemplatePlaceholders(
        'שם: {{fullName}}, כתובת: {{address}}, טלפון: {{phone}}',
        { fullName: 'ישראל', phone: '050' },
      )
      expect(result.resolved).toBe('שם: ישראל, כתובת: {{address}}, טלפון: 050')
      expect(result.unresolved).toEqual(['address'])
      expect(result.unresolvedLabels.address).toBe('כתובת')
    })

    it('returns empty unresolved when all filled', () => {
      const result = resolveTemplatePlaceholders('{{fullName}}', { fullName: 'test' })
      expect(result.unresolved).toEqual([])
      expect(result.unresolvedLabels).toEqual({})
    })
  })

  // ── buildVariablesFromProfile ─────────────────────────
  describe('buildVariablesFromProfile', () => {
    it('always includes date', () => {
      const vars = buildVariablesFromProfile(null, null)
      expect(vars.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    })

    it('maps profile fields', () => {
      const vars = buildVariablesFromProfile(
        { fullName: 'ישראל', idNumber: '123', email: 'a@b.com' },
        null,
      )
      expect(vars.fullName).toBe('ישראל')
      expect(vars.idNumber).toBe('123')
      expect(vars.email).toBe('a@b.com')
    })

    it('maps tenant fields', () => {
      const vars = buildVariablesFromProfile(null, {
        phone: '050',
        address: 'הרצל 5, תל אביב',
        floor: '3',
        apartment_number: '12',
      })
      expect(vars.phone).toBe('050')
      expect(vars.address).toBe('הרצל 5, תל אביב')
      expect(vars.floor).toBe('3')
      expect(vars.apartmentNumber).toBe('12')
    })

    it('maps project fields', () => {
      const vars = buildVariablesFromProfile(null, null, {
        name: 'Silver Castle',
        address: 'הרצל 10, חיפה',
        company_name: 'ABC',
      })
      expect(vars.projectName).toBe('Silver Castle')
      expect(vars.buildingAddress).toBe('הרצל 10, חיפה')
      expect(vars.companyName).toBe('ABC')
    })

    it('derives city and street from address', () => {
      const vars = buildVariablesFromProfile(null, {
        address: 'הרצל 5, תל אביב',
      })
      expect(vars.city).toBe('תל אביב')
      expect(vars.street).toBe('הרצל')
    })

    it('falls back phone from profile if tenant missing', () => {
      const vars = buildVariablesFromProfile({ phone: '050' }, {})
      expect(vars.phone).toBe('050')
    })

    it('falls back idNumber from tenant id_number', () => {
      const vars = buildVariablesFromProfile({}, { id_number: '999' })
      expect(vars.idNumber).toBe('999')
    })
  })
})
