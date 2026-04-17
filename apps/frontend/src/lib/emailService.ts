import emailjs from '@emailjs/browser'

const SERVICE_ID = 'service_6syl0l9'
const PUBLIC_KEY = 'KdV156vyZEqgAqOXZ'

// Initialize EmailJS
emailjs.init(PUBLIC_KEY)

export const TEMPLATES = {
  WELCOME: 'template_oo626xi',
} as const

interface WelcomeEmailParams {
  to_email: string
  to_name: string
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  try {
    await emailjs.send(SERVICE_ID, TEMPLATES.WELCOME, {
      to_email: params.to_email,
      to_name: params.to_name,
    })
    console.log('Welcome email sent to', params.to_email)
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}
