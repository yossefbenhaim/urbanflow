import { describe, it, expect } from 'vitest'
import { agreementTemplates } from '../data/agreementTemplates'
import { FIELD_LABELS, PROFILE_FIELD_MAP, HEBREW_PLACEHOLDER_MAP } from '../utils/templateRenderer'

const ALL_TEMPLATE_KEYS = [
  'agreement_principles',
  'power_of_attorney_lawyer',
  'disclosure_letter',
  'join_form',
  'tenant_survey',
  'election_form',
  'power_of_attorney',
  'meeting_summary',
  'final_agreement',
  'conditions_appendix',
  'tenant_declaration',
  'info_receipt',
  'alt_housing',
  'evac_protocol',
  'tenant_signatures',
  'rights_verification',
  'progress_reports',
  'quality_checks',
  'ownership_docs',
  'arch_plans',
  'appraisal_report',
  'building_permit',
  'form4',
  'delivery_protocol',
]

describe('agreementTemplates', () => {
  it('exports all 24 templates', () => {
    expect(Object.keys(agreementTemplates)).toHaveLength(24)
  })

  it('contains all expected template keys', () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      expect(agreementTemplates).toHaveProperty(key)
    }
  })

  it.each(ALL_TEMPLATE_KEYS)('template "%s" has valid structure', (key) => {
    const template = agreementTemplates[key]
    expect(template.key).toBe(key)
    expect(template.title).toBeTruthy()
    expect(Array.isArray(template.sections)).toBe(true)
    expect(template.sections.length).toBeGreaterThan(0)

    for (const section of template.sections) {
      expect(section.heading).toBeTruthy()
      expect(section.content).toBeTruthy()
    }
  })

  it('each template key matches its internal key field', () => {
    for (const [key, template] of Object.entries(agreementTemplates)) {
      expect(template.key).toBe(key)
    }
  })

  it('all templates have Hebrew titles', () => {
    for (const template of Object.values(agreementTemplates)) {
      expect(template.title).toMatch(/[\u0590-\u05FF]/)
    }
  })
})

describe('FIELD_LABELS', () => {
  it('has labels for all PROFILE_FIELD_MAP keys', () => {
    for (const key of Object.keys(PROFILE_FIELD_MAP)) {
      expect(FIELD_LABELS).toHaveProperty(key)
    }
  })

  it('all labels are non-empty Hebrew strings', () => {
    for (const label of Object.values(FIELD_LABELS)) {
      expect(label).toBeTruthy()
      expect(label).toMatch(/[\u0590-\u05FF]/)
    }
  })
})

describe('HEBREW_PLACEHOLDER_MAP', () => {
  it('all values map to valid FIELD_LABELS or PROFILE_FIELD_MAP keys', () => {
    const validKeys = new Set([
      ...Object.keys(FIELD_LABELS),
      ...Object.keys(PROFILE_FIELD_MAP),
    ])
    for (const [hebrew, english] of Object.entries(HEBREW_PLACEHOLDER_MAP)) {
      expect(validKeys.has(english)).toBe(true)
    }
  })

  it('all keys contain Hebrew characters', () => {
    for (const key of Object.keys(HEBREW_PLACEHOLDER_MAP)) {
      expect(key).toMatch(/[\u0590-\u05FF]/)
    }
  })
})
