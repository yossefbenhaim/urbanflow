// Required file kinds per inspection type. Server-side mirror of the
// frontend checklist in NewInspectionPage.tsx — both sides enforce the same
// contract so a client that skips the frontend check still fails server-side.
export const REQUIRED_FILE_KINDS_BY_INSPECTION: Record<string, string[]> = {
  architectural_feasibility: ['report_pdf'],
  planning_check: ['tama_doc'],
  cluster_feasibility: ['map'],
  constraints_check: ['report_pdf'],
  economic_feasibility: ['report_pdf'],
  property_valuation: ['valuation_report'],
  rental_assessment: ['rent_table'],
  commercial_appraisal: ['commercial_report'],
}
