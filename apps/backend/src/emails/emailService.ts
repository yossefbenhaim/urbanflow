import { readFileSync } from 'fs';
import { join } from 'path';

const TEMPLATES_DIR = join(__dirname, 'templates');
const SITE_URL = process.env.SITE_URL || 'https://urbanflow.byclick.co.il';
const LOGO_URL = `${SITE_URL}/castle-icon.svg`;

type TemplateVars = Record<string, string>;

function loadTemplate(templateName: string, vars: TemplateVars): string {
  const filePath = join(TEMPLATES_DIR, `${templateName}.html`);
  let html = readFileSync(filePath, 'utf-8');

  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  // Set defaults
  html = html.replace(/\{\{logoUrl\}\}/g, LOGO_URL);
  html = html.replace(/\{\{siteUrl\}\}/g, SITE_URL);

  return html;
}

// ברוכים הבאים - Welcome email after registration
export function renderWelcomeEmail(vars: {
  userName: string;
  userEmail: string;
  dashboardUrl?: string;
}): string {
  return loadTemplate('welcome', {
    ...vars,
    dashboardUrl: vars.dashboardUrl || `${SITE_URL}/dashboard`,
  });
}

// אימות אימייל - Email verification
export function renderEmailVerification(vars: {
  userName: string;
  userEmail: string;
  verificationUrl: string;
}): string {
  return loadTemplate('email-verification', vars);
}

// איפוס סיסמה - Password reset
export function renderPasswordReset(vars: {
  userName: string;
  userEmail: string;
  resetUrl: string;
}): string {
  return loadTemplate('password-reset', vars);
}

// הזמנה לפרויקט - Project invitation
export function renderProjectInvitation(vars: {
  userName: string;
  userEmail: string;
  inviterName: string;
  projectAddress: string;
  projectCity: string;
  unitsCount: string;
  inviteCode: string;
  joinUrl?: string;
}): string {
  return loadTemplate('project-invitation', {
    ...vars,
    joinUrl: vars.joinUrl || `${SITE_URL}/join`,
  });
}

// מסמך לחתימה - Document signature request
export function renderDocumentSignature(vars: {
  userName: string;
  userEmail: string;
  documentTitle: string;
  documentType: string;
  senderName: string;
  sendDate: string;
  expiryDate: string;
  urgencyClass: 'urgency-high' | 'urgency-normal';
  urgencyText: string;
  documentUrl: string;
}): string {
  return loadTemplate('document-signature', vars);
}

// תזכורת הצבעה - Vote reminder
export function renderVoteReminder(vars: {
  userName: string;
  userEmail: string;
  pollTitle: string;
  pollType: string;
  votePercentage: string;
  votedCount: string;
  totalCount: string;
  deadline: string;
  voteUrl: string;
}): string {
  return loadTemplate('vote-reminder', vars);
}

// עדכון מכרז - Tender update
export function renderTenderUpdate(vars: {
  userName: string;
  userEmail: string;
  tenderTitle: string;
  tenderCategory: string;
  statusClass: 'status-open' | 'status-closed' | 'status-evaluation';
  statusText: string;
  openDate: string;
  closeDate: string;
  bidsCount: string;
  updateMessage: string;
  updateDate: string;
  tenderUrl: string;
}): string {
  return loadTemplate('tender-update', vars);
}

// סיכום בדיקה - Inspection summary
export function renderInspectionSummary(vars: {
  userName: string;
  userEmail: string;
  inspectionAddress: string;
  inspectionType: string;
  inspectorName: string;
  inspectionDate: string;
  overallScore: string;
  nextStepsText: string;
  reportUrl: string;
}): string {
  return loadTemplate('inspection-summary', vars);
}

export const emailTemplates = {
  welcome: renderWelcomeEmail,
  emailVerification: renderEmailVerification,
  passwordReset: renderPasswordReset,
  projectInvitation: renderProjectInvitation,
  documentSignature: renderDocumentSignature,
  voteReminder: renderVoteReminder,
  tenderUpdate: renderTenderUpdate,
  inspectionSummary: renderInspectionSummary,
};
