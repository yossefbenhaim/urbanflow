import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const STATS = [
  { num: '500+', label: 'בניינים' },
  { num: '12,000+', label: 'דיירים' },
  { num: '98%', label: 'שביעות רצון' },
  { num: '6-10', label: 'שבועות MVP' },
]

const STEPS = [
  { icon: '🏠', num: '1', title: 'הירשם והצטרף לבניין שלך', desc: 'תהליך הצטרפות מהיר ופשוט — מלא פרטים, בחר בניין ואשר את זהותך תוך דקות.' },
  { icon: '🗳️', num: '2', title: 'הצביע, בחר נותני שירות ועקוב', desc: 'השתתף בהצבעות, עקוב אחרי ההתקדמות ובחר את בעלי המקצוע הטובים ביותר.' },
  { icon: '🏆', num: '3', title: 'קבל את הדירה החדשה שלך', desc: 'מ-blueprint ועד טופס 4 — אנחנו איתך בכל שלב עד שאתה נכנס לבית החדש.' },
]

const ROLES = [
  {
    icon: '👤', title: 'דייר',
    bullets: ['עקוב אחרי ההתקדמות בזמן אמת', 'הצביע על החלטות קריטיות', 'תקשר ישירות עם הצוות'],
  },
  {
    icon: '🤝', title: 'מלווה פרויקט',
    bullets: ['נהל ועדות דיירים', 'צור דוחות ומצגות', 'תאם בין כל הגורמים'],
  },
  {
    icon: '🔧', title: 'נותן שירות',
    bullets: ['הציע הצעות מחיר', 'עדכן סטטוס עבודות', 'קבל תשלומים בצורה מסודרת'],
  },
  {
    icon: '🏢', title: 'מנהל',
    bullets: ['נהל פרויקטים מרובים', 'ניתוחי BI ודשבורד', 'שליטה מלאה על כל הנכסים'],
  },
]

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>
          <span>🏰</span>
          <span>Silver <span className={styles.logoGold}>Castle</span></span>
        </Link>
        <ul className={styles.navLinks}>
          <li><a href="#how">כיצד זה עובד</a></li>
          <li><a href="#roles">יתרונות</a></li>
          <li><a href="#contact">צור קשר</a></li>
        </ul>
        <div className={styles.navCta}>
          <Link to="/login" className={styles.btnOutline}>כניסה</Link>
          <Link to="/register" className={styles.btnPrimary}>התחלה חינם</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <span className={styles.heroTag}>🏰 פלטפורמת ניהול ההתחדשות העירונית #1 בישראל</span>
          <h1 className={styles.heroTitle}>
            ניהול פינוי-בינוי.<br />
            <span>פשוט. שקוף. יחד.</span>
          </h1>
          <p className={styles.heroSub}>
            הפלטפורמה המובילה לניהול תהליך ההתחדשות העירונית — מהדייר הראשון עד טופס 4
          </p>
          <div className={styles.heroButtons}>
            <Link to="/register" className={styles.heroPrimary}>התחל עכשיו</Link>
            <a href="#how" className={styles.heroOutline}>צפה בהדגמה ▶</a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className={styles.section}>
          <span className={styles.sectionTag}>תהליך פשוט</span>
          <h2 className={styles.sectionTitle}>כיצד זה עובד?</h2>
          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.num} className={styles.stepCard}>
                <div className={styles.stepNum}>{step.num}</div>
                <span className={styles.stepIcon}>{step.icon}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className={styles.rolesBg}>
        <div className={styles.rolesInner}>
          <span className={styles.sectionTag}>מי זה בשבילי?</span>
          <h2 className={styles.sectionTitle}>פלטפורמה לכל הגורמים בתהליך</h2>
          <div className={styles.rolesGrid}>
            {ROLES.map((role) => (
              <div key={role.title} className={styles.roleCard}>
                <span className={styles.roleIcon}>{role.icon}</span>
                <h3 className={styles.roleTitle}>{role.title}</h3>
                <ul className={styles.roleBullets}>
                  {role.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaBg} />
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>מוכן להתחיל?</h2>
          <p className={styles.ctaSub}>הצטרף לאלפי דיירים שכבר מנהלים את תהליך ההתחדשות שלהם עם Silver Castle</p>
          <Link to="/register" className={styles.ctaBtn}>הרשמה חינם</Link>
          <p className={styles.ctaNote}>ללא כרטיס אשראי. ללא התחייבות.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerLogo}>🏰 Silver Castle</div>
            <p className={styles.footerDesc}>הפלטפורמה המובילה לניהול פינוי-בינוי והתחדשות עירונית בישראל.</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="#">פרטיות</a>
            <a href="#">תנאי שימוש</a>
            <a href="#">צור קשר</a>
          </div>
        </div>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Silver Castle. כל הזכויות שמורות.</p>
      </footer>
    </div>
  )
}
