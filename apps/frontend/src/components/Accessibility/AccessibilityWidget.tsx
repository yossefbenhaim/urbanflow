import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './AccessibilityWidget.module.css'

interface A11yState {
  fontSize: number
  highContrast: boolean
  invertColors: boolean
  grayscale: boolean
  underlineLinks: boolean
  bigCursor: boolean
  pauseAnimations: boolean
  dyslexiaFont: boolean
  textSpacing: boolean
  focusHighlight: boolean
  lineHeight: boolean
  saturation: boolean
}

const DEFAULT: A11yState = {
  fontSize: 0, highContrast: false, invertColors: false,
  grayscale: false, underlineLinks: false, bigCursor: false,
  pauseAnimations: false, dyslexiaFont: false, textSpacing: false,
  focusHighlight: false, lineHeight: false, saturation: false,
}

function load(): A11yState {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem('sc-a11y') || '{}') } }
  catch { return { ...DEFAULT } }
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [s, setS] = useState<A11yState>(load)

  const activeCount = Object.entries(s).filter(([k, v]) => k === 'fontSize' ? v > 0 : v).length

  // First-visit tooltip
  const [showTooltip, setShowTooltip] = useState(() => !localStorage.getItem('sc-a11y-seen'))
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  // Listen for external trigger from Navbar drawer
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-accessibility', handler)
    return () => window.removeEventListener('open-accessibility', handler)
  }, [])
  useEffect(() => {
    if (showTooltip) {
      localStorage.setItem('sc-a11y-seen', '1')
      const t = setTimeout(() => setShowTooltip(false), 3000)
      return () => clearTimeout(t)
    }
  }, [showTooltip])

  useEffect(() => {
    localStorage.setItem('sc-a11y', JSON.stringify(s))
    const root = document.documentElement

    // Font size
    root.style.fontSize = ['100%','115%','130%','150%'][s.fontSize] || '100%'

    // CSS filters
    const filters: string[] = []
    if (s.grayscale) filters.push('grayscale(100%)')
    if (s.invertColors) filters.push('invert(100%)')
    if (s.saturation) filters.push('saturate(200%)')
    root.style.filter = filters.join(' ')

    // High contrast
    if (s.highContrast) {
      document.body.classList.add('a11y-hc')
    } else {
      document.body.classList.remove('a11y-hc')
    }

    // Dynamic style injectors
    const inject = (id: string, css: string, active: boolean) => {
      const el = document.getElementById(id)
      if (active) {
        if (el) { el.textContent = css; return }
        const style = document.createElement('style')
        style.id = id
        style.textContent = css
        document.head.appendChild(style)
      } else {
        el?.remove()
      }
    }

    inject('a11y-links', 'a { text-decoration: underline !important; }', s.underlineLinks)
    inject('a11y-anim', '*, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }', s.pauseAnimations)
    inject('a11y-font', "* { font-family: 'Lexend', 'Arial', sans-serif !important; }", s.dyslexiaFont)
    inject('a11y-spacing', '* { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }', s.textSpacing)
    inject('a11y-focus', '*:focus { outline: 4px solid #f59e0b !important; outline-offset: 2px !important; }', s.focusHighlight)
    inject('a11y-lh', '* { line-height: 2 !important; }', s.lineHeight)

    // Big cursor
    root.style.cursor = s.bigCursor ? 'zoom-in' : ''
  }, [s])

  const toggle = (key: keyof A11yState) => setS(p => ({ ...p, [key]: !p[key] }))
  const cycleFontSize = () => setS(p => ({ ...p, fontSize: (p.fontSize + 1) % 4 }))

  const reset = () => {
    setS({ ...DEFAULT })
    document.documentElement.style.cssText = ''
    document.body.classList.remove('a11y-hc')
    ;['a11y-links','a11y-anim','a11y-font','a11y-spacing','a11y-focus','a11y-lh'].forEach(id => document.getElementById(id)?.remove())
  }

  const Opt = ({ icon, label, k }: { icon: string; label: string; k: keyof A11yState }) => (
    <button onClick={() => k === 'fontSize' ? cycleFontSize() : toggle(k)} className={`${styles.opt} ${k === 'fontSize' ? (s.fontSize > 0 ? styles.optOn : '') : (s[k] ? styles.optOn : '')}`}>
      <span className={styles.optIcon}>{icon}</span>
      <span className={styles.optLabel}>{label}</span>
    </button>
  )

  return (
    <div className={styles.root} dir="rtl">
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <span>⚙️ הגדרות נגישות</span>
            <button onClick={() => setOpen(false)} className={styles.closeBtn} aria-label="סגור">✕</button>
          </div>

          {/* Body — 4x3 grid */}
          <div className={styles.body}>
            <div className={styles.grid}>
              {/* Row 1 */}
              <Opt icon="Aa+" label="גודל גופן" k="fontSize" />
              <Opt icon="◐" label="ניגודיות" k="highContrast" />
              <Opt icon="↩" label="הפוך צבעים" k="invertColors" />
              {/* Row 2 */}
              <Opt icon="◼" label="גווני אפור" k="grayscale" />
              <Opt icon="🎨" label="רוויה" k="saturation" />
              <Opt icon="__" label="קו לקישורים" k="underlineLinks" />
              {/* Row 3 */}
              <Opt icon="↔" label="ריווח טקסט" k="textSpacing" />
              <Opt icon="↕" label="גובה שורה" k="lineHeight" />
              <Opt icon="Dx" label="דיסלקציה" k="dyslexiaFont" />
              {/* Row 4 */}
              <Opt icon="⊕" label="סמן גדול" k="bigCursor" />
              <Opt icon="◎" label="הדגשת מיקוד" k="focusHighlight" />
              <Opt icon="⏸" label="עצור אנימציות" k="pauseAnimations" />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button onClick={reset} className={styles.reset}>איפוס הגדרות</button>
            <span className={styles.counter}>{activeCount}/12</span>
          </div>
        </div>
      )}

      <div className={styles.fabWrap} style={{ display: isLandingPage ? undefined : 'none' }}>
        {showTooltip && (
          <div className={styles.tooltip}>
            <span className={styles.tooltipWave}>👋</span>
            <span>יש לך שאלה? אני כאן!</span>
          </div>
        )}
        <button onClick={() => setOpen(o => !o)} className={styles.fab} aria-label="תפריט נגישות">
          {/* Accessibility person icon */}
          <svg className={styles.fabIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="4" r="2" />
            <path d="M13 7h-2c-2.76 0-5 2.24-5 5v2h2v-2c0-1.1.45-2.09 1.17-2.83L9 22h2.5l1.5-6 1.5 6H17l-.17-12.83A4.982 4.982 0 0 1 18 12v2h2v-2c0-2.76-2.24-5-5-5z" />
          </svg>
          {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
        </button>
      </div>
    </div>
  )
}
