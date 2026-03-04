import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import styles from './Landing.module.css'
import NumbersRain from '../components/NumbersRain'

const STATS = [
  { num: '500+', label: 'בניינים רשומים' },
  { num: '12,000+', label: 'דיירים פעילים' },
  { num: '98%', label: 'שביעות רצון' },
  { num: '6–10', label: 'שבועות לMVP' },
]

const STEPS = [
  { icon: '🏠', num: '01', title: 'הירשם והצטרף לבניין שלך', desc: 'תהליך הצטרפות מהיר ופשוט — מלא פרטים, בחר בניין ואשר את זהותך תוך דקות.' },
  { icon: '🗳️', num: '02', title: 'הצביע ובחר נותני שירות', desc: 'השתתף בהצבעות, עקוב אחרי ההתקדמות ובחר את בעלי המקצוע הטובים ביותר.' },
  { icon: '🏆', num: '03', title: 'קבל את הדירה החדשה שלך', desc: 'מ-blueprint ועד טופס 4 — אנחנו איתך בכל שלב עד שאתה נכנס לבית החדש.' },
]

const ROLES = [
  { icon: '👤', title: 'דייר', bullets: ['עקוב אחרי ההתקדמות בזמן אמת', 'הצביע על החלטות קריטיות', 'תקשר ישירות עם הצוות'] },
  { icon: '🧭', title: 'גורם מלווה', bullets: ['נהל את כל הפרויקט ממקום אחד', 'תאם בין כל הגורמים', 'פתח מכרזים ובחר ספקים'] },
  { icon: '🏗️', title: 'נותן שירות', bullets: ['הגש הצעות למכרזים', 'עדכן סטטוס שבועי', 'בנה מוניטין ודירוג'] },
  { icon: '🧑‍💼', title: 'מנהל מערכת', bullets: ['שליטה מלאה בכל ישויות', 'פתרון קונפליקטים', 'ניתוח נתונים ודוחות'] },
]

const HERO_TEXTS = [
  "פשוט. שקוף. יחד.",
  "ועדיין לא ברור מה קורה?",
  "מהמפתח הישן למפתח החדש.",
]

export default function Landing() {
  const [textIdx, setTextIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setTextIdx(i => (i + 1) % HERO_TEXTS.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className={styles.page} dir="rtl">

      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}><img src="/logo.svg" alt="SC" className={styles.logoImg} />Silver <span className={styles.logoAccent}>Castle</span></Link>
        <ul className={styles.navLinks}>
          <li><a href="#how">כיצד זה עובד</a></li>
          <li><a href="#roles">למי זה מתאים</a></li>
          <li><a href="#cta">צור קשר</a></li>
        </ul>
        <div className={styles.navCta}>
          <Link to="/login" className={styles.btnOutline}>כניסה</Link>
          <Link to="/register" className={styles.btnPrimary}>הרשמה חינם</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        {/* Numbers rain canvas */}
        <NumbersRain />
        {/* soft gradient overlay on top of canvas */}
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <span className={styles.heroTag}>🚀 פלטפורמת ניהול התחדשות עירונית #1</span>
          <h1 className={styles.heroTitle}>
            עשרות מסמכים. עשרות ישיבות.<br />
            <span className={styles.heroGradientText}>ועדיין לא ברור מה קורה?</span>
          </h1>
          <p className={styles.heroSub}>
            Silver Castle שמה אותך במרכז — כל עדכון, כל מסמך, כל החלטה — בלחיצה אחת.
          </p>
          <div className={styles.heroButtons}>
            <Link to="/register" className={styles.heroPrimary}>התחל עכשיו בחינם</Link>
            <a href="#how" className={styles.heroOutline}>איך זה עובד ↓</a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className={styles.stats}>
        <div className={styles.statsGrid}>
          {STATS.map(s => (
            <div key={s.label} className={styles.statItem}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" className={styles.section}>
        <span className={styles.sectionTag}>תהליך</span>
        <h2 className={styles.sectionTitle}>שלושה שלבים פשוטים</h2>
        <div className={styles.stepsGrid}>
          {STEPS.map(s => (
            <div key={s.num} className={styles.stepCard}>
              <span className={styles.stepNum}>{s.num}</span>
              <span className={styles.stepIcon}>{s.icon}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className={styles.rolesBg}>
        <div className={styles.rolesInner}>
          <span className={styles.sectionTag}>משתמשים</span>
          <h2 className={styles.sectionTitle}>למי זה מתאים?</h2>
          <div className={styles.rolesGrid}>
            {ROLES.map(r => (
              <div key={r.title} className={styles.roleCard}>
                <span className={styles.roleIcon}>{r.icon}</span>
                <h3 className={styles.roleTitle}>{r.title}</h3>
                <ul className={styles.roleBullets}>
                  {r.bullets.map(b => <li key={b}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>מוכן להתחיל?</h2>
          <p className={styles.ctaSub}>הצטרף לאלפי דיירים שכבר מנהלים את תהליך ההתחדשות שלהם בצורה חכמה.</p>
          <Link to="/register" className={styles.ctaBtn}>הרשמה חינם עכשיו</Link>
          <p className={styles.ctaNote}>ללא כרטיס אשראי • ללא התחייבות</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerLogo}><img src="/logo.svg" alt="SC" className={styles.logoImg} />Silver Castle</div>
            <p className={styles.footerDesc}>הפלטפורמה המובילה לניהול התחדשות עירונית בישראל.</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="#">פרטיות</a>
            <a href="#">תנאי שימוש</a>
            <a href="#">צור קשר</a>
          </div>
        </div>
        <p className={styles.footerCopy}>© 2026 Silver Castle. כל הזכויות שמורות.</p>
      </footer>
    </div>
  )
}
