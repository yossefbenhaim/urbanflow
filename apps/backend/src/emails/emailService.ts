import { readFileSync } from 'fs';
import { join } from 'path';
import emailjs from '@emailjs/nodejs';
import { logger } from '../logger';

const TEMPLATES_DIR = join(__dirname, 'templates');
const SITE_URL = process.env.SITE_URL || 'https://urbanflow.byclick.co.il';
const LOGO_URL = `${SITE_URL}/castle-icon.svg`;

type TemplateVars = Record<string, string>;

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';

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

export type EmailTemplateKey = keyof typeof emailTemplates;

const SUBJECTS: Record<EmailTemplateKey, string> = {
  welcome: 'ברוכים הבאים ל-Silver Castle',
  emailVerification: 'אימות כתובת אימייל - Silver Castle',
  passwordReset: 'איפוס סיסמה - Silver Castle',
  projectInvitation: 'הזמנה לפרויקט - Silver Castle',
  documentSignature: 'מסמך ממתין לחתימה - Silver Castle',
  voteReminder: 'תזכורת הצבעה - Silver Castle',
  tenderUpdate: 'עדכון מכרז - Silver Castle',
  inspectionSummary: 'סיכום בדיקת נכס - Silver Castle',
};

export async function sendEmail<K extends EmailTemplateKey>(
  templateKey: K,
  to: string,
  vars: Parameters<typeof emailTemplates[K]>[0]
): Promise<void> {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
    logger.warn({ templateKey, to }, 'EmailJS env vars missing — skipping email send');
    return;
  }

  const render = emailTemplates[templateKey] as (v: unknown) => string;
  const html = render(vars);
  const subject = SUBJECTS[templateKey];

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      { subject, to_email: to, html_content: html },
      { publicKey: EMAILJS_PUBLIC_KEY, privateKey: EMAILJS_PRIVATE_KEY }
    );
    logger.info({ templateKey, to, status: response.status }, 'email sent');
  } catch (err) {
    logger.error({ err, templateKey, to }, 'email send failed');
  }
}
