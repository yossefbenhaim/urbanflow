import { describe, it, expect } from 'vitest'
import {
  agreementTemplates,
  getAgreementTemplate,
  getAgreementKeys,
  AgreementTemplate,
} from '../agreementTemplates'

const EXPECTED_KEYS = [
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
  it('contains all 24 expected templates', () => {
    const keys = Object.keys(agreementTemplates)
    expect(keys).toHaveLength(24)
    for (const key of EXPECTED_KEYS) {
      expect(agreementTemplates[key]).toBeDefined()
    }
  })

  it('every template has valid structure', () => {
    for (const [key, template] of Object.entries(agreementTemplates)) {
      expect(template.key).toBe(key)
      expect(template.title).toBeTruthy()
      expect(template.sections.length).toBeGreaterThan(0)

      for (const section of template.sections) {
        expect(section.heading).toBeTruthy()
        expect(section.content).toBeTruthy()
      }
    }
  })

  it('no template has empty sections', () => {
    for (const [key, template] of Object.entries(agreementTemplates)) {
      for (const section of template.sections) {
        expect(section.content.trim().length).toBeGreaterThan(10)
      }
    }
  })
})

describe('getAgreementTemplate', () => {
  it('returns template for valid key', () => {
    const template = getAgreementTemplate('agreement_principles')
    expect(template).not.toBeNull()
    expect(template!.title).toContain('הסכם עקרונות')
  })

  it('returns null for invalid key', () => {
    expect(getAgreementTemplate('nonexistent')).toBeNull()
  })
})

describe('getAgreementKeys', () => {
  it('returns all template keys', () => {
    const keys = getAgreementKeys()
    expect(keys).toHaveLength(24)
    expect(keys).toEqual(expect.arrayContaining(EXPECTED_KEYS))
  })
})
