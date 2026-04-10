import { useState } from 'react'
import { Document, Page, Text, View, Image, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { AgreementTemplate } from '../data/agreementTemplates'
import { normalizePlaceholderName } from '../utils/templateRenderer'

// PDF-specific template fill: replace unresolved placeholders with underline blanks
const PLACEHOLDER_REGEX = /\{\{([\w\u0590-\u05FF]+)\}\}/g
function fillTemplateForPDF(text: string, vars: Record<string, string>): string {
  return text.replace(PLACEHOLDER_REGEX, (_match, rawName: string) => {
    const key = normalizePlaceholderName(rawName)
    return vars[key] || '_____________'
  })
}

// Register Heebo TTF fonts — local files served from /public/fonts
// These include Hebrew character support (react-pdf requires TTF, not WOFF)
Font.register({
  family: 'Heebo',
  fonts: [
    { src: '/fonts/Heebo-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Heebo-Bold.ttf', fontWeight: 700 },
  ],
})

// Disable hyphenation — Hebrew words should never be hyphenated
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Heebo', fontSize: 11 },
  header: { marginBottom: 20, borderBottom: '2px solid #1e3a5f', paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: '#1e3a5f', textAlign: 'right' },
  headerSub: { fontSize: 10, color: '#5a5a6e', textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginTop: 14, marginBottom: 6, textAlign: 'right' },
  sectionContent: { fontSize: 10, color: '#333333', lineHeight: 1.7, textAlign: 'right' },
  footer: { marginTop: 30, borderTop: '1px solid #eeeeee', paddingTop: 15 },
  footerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 9, color: '#5a5a6e', textAlign: 'right' },
  signatureImage: { width: 150, height: 60, objectFit: 'contain' },
  digitalBadge: { fontSize: 8, color: '#4a8c5c', marginTop: 4, textAlign: 'right' },
})

interface Props {
  template: AgreementTemplate | null
  variables: Record<string, string>
  filledVariables?: Record<string, string>
  signatureImage?: string
  docTitle: string
}

function DocPDF({ template, variables, filledVariables = {}, signatureImage, docTitle }: Props) {
  // Merge variables: filledVariables (auto-filled + manually filled) take priority
  const mergedVars = { ...variables, ...filledVariables }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Silver Castle</Text>
          <Text style={styles.headerSub}>{template?.title || docTitle} | {mergedVars.date || ''}</Text>
        </View>

        {template?.sections.map((section, i) => (
          <View key={i}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            <Text style={styles.sectionContent}>{fillTemplateForPDF(section.content, mergedVars)}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerText}>שם: {mergedVars.fullName || ''}</Text>
              <Text style={styles.footerText}>ת.ז.: {mergedVars.idNumber || ''}</Text>
              <Text style={styles.footerText}>כתובת: {mergedVars.address || ''}</Text>
              <Text style={styles.footerText}>תאריך: {mergedVars.date || ''}</Text>
              <Text style={styles.digitalBadge}>נחתם דיגיטלית באמצעות Silver Castle</Text>
            </View>
            {signatureImage && (
              <Image src={signatureImage} style={styles.signatureImage} />
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default function GenerateDocPDF(props: Props) {
  const [generating, setGenerating] = useState(false)

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const blob = await pdf(<DocPDF {...props} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${props.template?.title || props.docTitle || 'document'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="w-full py-3 rounded-xl font-bold text-white transition"
      style={{ backgroundColor: '#8b6f47' }}
    >
      {generating ? 'מייצר PDF...' : 'הורד PDF 📄'}
    </button>
  )
}
