/**
 * Template variable labels in Hebrew — used for placeholder display and input labels.
 */
export const FIELD_LABELS: Record<string, string> = {
  fullName: 'שם מלא',
  idNumber: 'תעודת זהות',
  address: 'כתובת',
  phone: 'טלפון',
  email: 'אימייל',
  floor: 'קומה',
  apartmentNumber: 'מספר דירה',
  apartmentSqm: 'שטח דירה (מ"ר)',
  parkingNumber: 'מספר חניה',
  storageNumber: 'מספר מחסן',
  date: 'תאריך',
  city: 'עיר',
  street: 'רחוב',
  buildingNumber: 'מספר בניין',
  moveInYear: 'שנת כניסה',
  buildingName: 'שם הבניין',
  buildingAddress: 'כתובת הבניין',
  projectName: 'שם הפרויקט',
  spouseName: 'שם בן/בת זוג',
  spouseId: 'ת.ז. בן/בת זוג',
  lawyerName: 'שם עורך הדין',
  companyName: 'שם החברה היזמית',
  representativeName: 'שם נציג הדיירים',
  meetingDate: 'תאריך האסיפה',
  meetingNumber: 'מספר אסיפה',
}

/**
 * Maps template variable names → data source field paths.
 * Used by buildVariablesFromProfile to auto-fill template data.
 */
export const PROFILE_FIELD_MAP: Record<string, { source: 'profile' | 'tenant' | 'project'; key: string }> = {
  fullName:           { source: 'profile', key: 'fullName' },
  idNumber:           { source: 'profile', key: 'idNumber' },
  email:              { source: 'profile', key: 'email' },
  phone:              { source: 'tenant',  key: 'phone' },
  address:            { source: 'tenant',  key: 'address' },
  floor:              { source: 'tenant',  key: 'floor' },
  apartmentNumber:    { source: 'tenant',  key: 'apartment_number' },
  apartmentSqm:       { source: 'tenant',  key: 'apartment_sqm' },
  parkingNumber:      { source: 'tenant',  key: 'parking_number' },
  storageNumber:      { source: 'tenant',  key: 'storage_number' },
  buildingNumber:     { source: 'tenant',  key: 'building_number' },
  moveInYear:         { source: 'tenant',  key: 'move_in_year' },
  projectName:        { source: 'project', key: 'name' },
  buildingAddress:    { source: 'project', key: 'address' },
  companyName:        { source: 'project', key: 'company_name' },
  lawyerName:         { source: 'project', key: 'lawyer_name' },
  representativeName: { source: 'project', key: 'representative_name' },
}

/**
 * Hebrew-to-English placeholder name mapping.
 * Allows templates to use {{שם_מלא}} alongside {{fullName}}.
 */
export const HEBREW_PLACEHOLDER_MAP: Record<string, string> = {
  'שם_מלא': 'fullName',
  'תעודת_זהות': 'idNumber',
  'תז': 'idNumber',
  'כתובת': 'address',
  'טלפון': 'phone',
  'אימייל': 'email',
  'דואל': 'email',
  'קומה': 'floor',
  'מספר_דירה': 'apartmentNumber',
  'דירה': 'apartmentNumber',
  'שטח_דירה': 'apartmentSqm',
  'מספר_חניה': 'parkingNumber',
  'חניה': 'parkingNumber',
  'מספר_מחסן': 'storageNumber',
  'מחסן': 'storageNumber',
  'תאריך': 'date',
  'עיר': 'city',
  'רחוב': 'street',
  'מספר_בניין': 'buildingNumber',
  'שנת_כניסה': 'moveInYear',
  'שנת_כניסה_לדירה': 'moveInYear',
  'שם_הבניין': 'buildingName',
  'כתובת_בניין': 'buildingAddress',
  'כתובת_הבניין': 'buildingAddress',
  'שם_פרויקט': 'projectName',
  'שם_הפרויקט': 'projectName',
  'שם_בן_זוג': 'spouseName',
  'שם_בת_זוג': 'spouseName',
  'תז_בן_זוג': 'spouseId',
  'תז_בת_זוג': 'spouseId',
  'שם_עורך_דין': 'lawyerName',
  'עורך_דין': 'lawyerName',
  'שם_חברה': 'companyName',
  'חברה_יזמית': 'companyName',
  'שם_נציג': 'representativeName',
  'נציג_דיירים': 'representativeName',
  'תאריך_אסיפה': 'meetingDate',
  'מספר_אסיפה': 'meetingNumber',
}

/** Supports both English (\w+) and Hebrew/underscore placeholder names */
const PLACEHOLDER_REGEX = /\{\{([\w\u0590-\u05FF]+)\}\}/g

/**
 * Build a variables map from user profile + tenant profile + project data.
 * Automatically adds today's date.
 *
 * @param profile       - UserProfile from useUser() / auth.me
 * @param tenantProfile - TenantProfile from tenant.getMyProfile
 * @param projectData   - Project from tenant.getMyProject or tenant.getProjectMembership
 */
export function buildVariablesFromProfile(
  profile: Record<string, any> | null | undefined,
  tenantProfile: Record<string, any> | null | undefined,
  projectData?: Record<string, any> | null,
): Record<string, string> {
  const vars: Record<string, string> = {}

  // Auto-fill date
  const now = new Date()
  vars.date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

  if (!profile && !tenantProfile && !projectData) return vars

  for (const [varName, mapping] of Object.entries(PROFILE_FIELD_MAP)) {
    let source: Record<string, any> | null | undefined
    if (mapping.source === 'profile') source = profile
    else if (mapping.source === 'tenant') source = tenantProfile
    else if (mapping.source === 'project') source = projectData
    if (!source) continue
    const raw = source[mapping.key]
    if (raw != null && raw !== '') {
      vars[varName] = String(raw)
    }
  }

  // phone fallback: try profile if tenant didn't have it
  if (!vars.phone && profile?.phone) {
    vars.phone = String(profile.phone)
  }
  // idNumber fallback: try tenant profile (different column names in different contexts)
  if (!vars.idNumber && tenantProfile?.id_number) {
    vars.idNumber = String(tenantProfile.id_number)
  }
  if (!vars.idNumber && profile?.idNumber) {
    vars.idNumber = String(profile.idNumber)
  }

  // apartmentSqm fallback: some mutations store as apartment_size_sqm
  if (!vars.apartmentSqm && tenantProfile?.apartment_size_sqm) {
    vars.apartmentSqm = String(tenantProfile.apartment_size_sqm)
  }

  // buildingAddress fallback: derive from project address if not set directly
  if (!vars.buildingAddress && projectData?.address) {
    vars.buildingAddress = String(projectData.address)
  }

  // Derive city/street from address if available (format: "street buildingNumber, city")
  if (vars.address && !vars.city) {
    const commaIdx = vars.address.lastIndexOf(',')
    if (commaIdx !== -1) {
      vars.city = vars.address.slice(commaIdx + 1).trim()
      vars.street = vars.address.slice(0, commaIdx).replace(/\s*\d+\s*$/, '').trim()
    }
  }

  // Derive city/street from buildingAddress as well if still missing
  if (vars.buildingAddress && !vars.city) {
    const commaIdx = vars.buildingAddress.lastIndexOf(',')
    if (commaIdx !== -1) {
      vars.city = vars.buildingAddress.slice(commaIdx + 1).trim()
      if (!vars.street) {
        vars.street = vars.buildingAddress.slice(0, commaIdx).replace(/\s*\d+\s*$/, '').trim()
      }
    }
  }

  return vars
}

/**
 * Replaces {{variableName}} placeholders in template text with actual values.
 * If a variable is missing or empty, the placeholder is kept as-is.
 */
export function fillTemplate(
  templateText: string,
  profileData: Record<string, string>,
): string {
  return templateText.replace(PLACEHOLDER_REGEX, (match, rawName: string) => {
    const key = normalizePlaceholderName(rawName)
    const value = profileData[key]
    return value ? value : match
  })
}

/**
 * Returns field names from the template that don't have values in the provided variables.
 */
export function getUnfilledFields(
  templateText: string,
  profileData: Record<string, string>,
): string[] {
  const required = getRequiredFields(templateText)
  return required.filter((field) => !profileData[field])
}

/**
 * Extracts all unique {{variableName}} field names from a template string.
 */
export function getRequiredFields(template: string): string[] {
  const fields = new Set<string>()
  let match: RegExpExecArray | null

  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g')
  while ((match = regex.exec(template)) !== null) {
    fields.add(normalizePlaceholderName(match[1]))
  }

  return Array.from(fields)
}

/**
 * Normalises a placeholder name: if it's a Hebrew key, maps it to the English
 * variable name; otherwise returns the original key.
 */
export function normalizePlaceholderName(name: string): string {
  return HEBREW_PLACEHOLDER_MAP[name] ?? name
}

export interface ResolveResult {
  /** The template string with all available placeholders filled in. */
  resolved: string
  /** Placeholder names (normalised to English keys) that had no value. */
  unresolved: string[]
  /** Hebrew labels for the unresolved fields (for UI display). */
  unresolvedLabels: Record<string, string>
}

/**
 * Combined resolve function: fills the template and returns the result together
 * with any unresolved placeholders and their display labels.
 *
 * Supports both English (`{{fullName}}`) and Hebrew (`{{שם_מלא}}`) placeholders.
 */
export function resolveTemplatePlaceholders(
  templateText: string,
  data: Record<string, string>,
): ResolveResult {
  const unresolvedSet = new Set<string>()

  const resolved = templateText.replace(PLACEHOLDER_REGEX, (match, rawName: string) => {
    const key = normalizePlaceholderName(rawName)
    const value = data[key]
    if (value) return value
    unresolvedSet.add(key)
    return match
  })

  const unresolved = Array.from(unresolvedSet)
  const unresolvedLabels: Record<string, string> = {}
  for (const key of unresolved) {
    unresolvedLabels[key] = FIELD_LABELS[key] ?? key
  }

  return { resolved, unresolved, unresolvedLabels }
}

// Legacy aliases for backward compatibility
export const parseTemplate = fillTemplate
export const getMissingFields = getUnfilledFields
