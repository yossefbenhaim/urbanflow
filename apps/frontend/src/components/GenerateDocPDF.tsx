import { useState } from 'react'
import { Document, Page, Text, View, Image, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import type { AgreementTemplate } from '../data/agreementTemplates'

// Register Hebrew-supporting font
Font.register({
  family: 'Heebo',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/heebo@5.0.0/files/heebo-latin-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/heebo@5.0.0/files/heebo-latin-700-normal.woff', fontWeight: 700 },
  ],
})

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
  signatureImage: { width: 150, height: 60, objectFit: 'contain' as any },
  digitalBadge: { fontSize: 8, color: '#4a8c5c', marginTop: 4, textAlign: 'right' },
})

interface Props {
  template: AgreementTemplate | null
  fullName: string
  idNumber: string
  address: string
  date: string
  signatureImage?: string
  docTitle: string
}

function DocPDF({ template, fullName, idNumber, address, date, signatureImage, docTitle }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Silver Castle</Text>
          <Text style={styles.headerSub}>{template?.title || docTitle} | {date}</Text>
        </View>

        {template?.sections.map((section, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerText}>שם: {fullName}</Text>
              <Text style={styles.footerText}>ת.ז.: {idNumber}</Text>
              <Text style={styles.footerText}>כתובת: {address}</Text>
              <Text style={styles.footerText}>תאריך: {date}</Text>
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
