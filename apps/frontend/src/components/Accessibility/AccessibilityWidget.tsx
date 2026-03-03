import { useState, useEffect } from 'react'
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

  const reset = () => {
    setS({ ...DEFAULT })
    document.documentElement.style.cssText = ''
    document.body.classList.remove('a11y-hc')
    ;['a11y-links','a11y-anim','a11y-font','a11y-spacing','a11y-focus','a11y-lh'].forEach(id => document.getElementById(id)?.remove())
  }

  const Opt = ({ icon, label, k }: { icon: string; label: string; k: keyof A11yState }) => (
    <button onClick={() => toggle(k)} className={`${styles.opt} ${s[k] ? styles.optOn : ''}`}>
      <span>{icon}</span>
      <span className={styles.optLabel}>{label}</span>
      {s[k] && <span className={styles.check}>✓</span>}
    </button>
  )

  return (
    <div className={styles.root} dir="rtl">
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>♿ נגישות</span>
            {activeCount > 0 && <button onClick={reset} className={styles.reset}>איפוס</button>}
          </div>

          <div className={styles.sec}>
            <div className={styles.secTitle}>גודל טקסט</div>
            <div className={styles.fontRow}>
              <button className={styles.fontBtn} onClick={() => setS(p => ({ ...p, fontSize: Math.max(0, p.fontSize - 1) }))}>A−</button>
              <span className={styles.fontVal}>{['רגיל','+קטן','+בינוני','+גדול'][s.fontSize]}</span>
              <button className={styles.fontBtn} onClick={() => setS(p => ({ ...p, fontSize: Math.min(3, p.fontSize + 1) }))}>A+</button>
            </div>
          </div>

          <div className={styles.sec}>
            <div className={styles.secTitle}>תצוגה</div>
            <div className={styles.grid}>
              <Opt icon="🌑" label="ניגודיות גבוהה" k="highContrast" />
              <Opt icon="🔄" label="היפוך צבעים" k="invertColors" />
              <Opt icon="⬛" label="גוני אפור" k="grayscale" />
              <Opt icon="🔆" label="רוויה גבוהה" k="saturation" />
            </div>
          </div>

          <div className={styles.sec}>
            <div className={styles.secTitle}>קריאה</div>
            <div className={styles.grid}>
              <Opt icon="🔗" label="קו תחת קישורים" k="underlineLinks" />
              <Opt icon="📏" label="ריווח טקסט" k="textSpacing" />
              <Opt icon="↕️" label="גובה שורה" k="lineHeight" />
              <Opt icon="🔡" label="פונט דיסלקציה" k="dyslexiaFont" />
            </div>
          </div>

          <div className={styles.sec}>
            <div className={styles.secTitle}>ניווט</div>
            <div className={styles.grid}>
              <Opt icon="🖱️" label="סמן גדול" k="bigCursor" />
              <Opt icon="🎯" label="הדגשת פוקוס" k="focusHighlight" />
              <Opt icon="⏸️" label="עצור אנימציות" k="pauseAnimations" />
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)} className={styles.fab} aria-label="תפריט נגישות">
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-1 5h2l1 5 3-1 .5 2-3.5 1v5h-2v-5l-3.5-1 .5-2 3 1-1-5z"/>
        </svg>
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>
    </div>
  )
}
