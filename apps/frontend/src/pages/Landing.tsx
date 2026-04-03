import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

/* ─── SCROLL ANIMATION HOOK ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s ${delay}s cubic-bezier(.22,1,.36,1), transform 0.7s ${delay}s cubic-bezier(.22,1,.36,1)`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── SECTION UNDERLINE ─── */
function GradientUnderline() {
  return (
    <div
      className="mx-auto mt-3 rounded-full"
      style={{
        width: 48,
        height: 3,
        background: 'linear-gradient(to left, #3b6b9c, #8b6f47)',
      }}
    />
  )
}

/* ─── MAIN LANDING ─── */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white text-[#212121] overflow-x-hidden font-heebo">

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}
        style={{ height: 64 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-full">
          {/* Logo — right */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div
              className="flex items-center justify-center rounded-[9px]"
              style={{ width: 36, height: 36, background: '#ebf1f7', color: '#1e3a5f', fontSize: 12, fontWeight: 700 }}
            >
              SC
            </div>
            <span style={{ color: '#212121', fontSize: 17, fontWeight: 700 }}>Silver Castle</span>
          </Link>

          {/* Nav links — center */}
          <div className="hidden md:flex items-center gap-6">
            {[
              ['process', 'איך זה עובד'],
              ['benefits', 'למה אנחנו'],
              ['roles', 'תפקידים'],
              ['contact', 'צור קשר'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="bg-transparent border-none cursor-pointer hover:text-[#212121] transition-colors"
                style={{ color: '#5a5a6e', fontSize: 14, fontWeight: 400 }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Auth buttons — left */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/login"
              className="no-underline rounded-lg border px-4 py-2 transition-colors hover:bg-gray-50"
              style={{ color: '#1e3a5f', fontSize: 13, fontWeight: 600, borderColor: '#d1d5db' }}
            >
              התחברות
            </Link>
            <Link
              to="/register"
              className="no-underline rounded-lg px-4 py-2 transition-opacity hover:opacity-90"
              style={{ background: '#8b6f47', color: '#fff', fontSize: 12, fontWeight: 600 }}
            >
              הרשמה חינם
            </Link>
          </div>

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 text-[#212121] bg-transparent border-none">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 bg-white border-t ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 py-4 space-y-1">
            {[
              ['process', 'איך זה עובד'],
              ['benefits', 'למה אנחנו'],
              ['roles', 'תפקידים'],
              ['contact', 'צור קשר'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="block w-full text-right px-4 py-3 rounded-lg hover:bg-gray-50 bg-transparent border-none cursor-pointer"
                style={{ color: '#5a5a6e', fontSize: 14 }}
              >
                {label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="no-underline rounded-lg border px-4 py-2" style={{ color: '#1e3a5f', fontSize: 13, fontWeight: 600, borderColor: '#d1d5db' }}>
                התחברות
              </Link>
              <Link to="/register" className="no-underline rounded-lg px-4 py-2" style={{ background: '#8b6f47', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                הרשמה חינם
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section
        className="pt-16"
        style={{
          background: 'linear-gradient(180deg, #ebf1f7 0%, #ffffff 50%, #f5f0e8 100%)',
          minHeight: 560,
        }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Right column — text */}
            <div className="order-1">
              <Reveal>
                {/* Badge */}
                <span
                  className="inline-block rounded-full px-4 py-1 mb-5"
                  style={{ background: '#ebf1f7', color: '#3b6b9c', fontSize: 12, fontWeight: 600 }}
                >
                  הפלטפורמה המובילה להתחדשות עירונית
                </span>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="leading-tight mb-4">
                  <span className="block" style={{ color: '#212121', fontSize: 46, fontWeight: 800 }}>
                    התחדשות עירונית
                  </span>
                  <span className="block" style={{ color: '#3b6b9c', fontSize: 46, fontWeight: 800 }}>
                    בהתאמה אישית
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.1}>
                <p className="mb-6" style={{ color: '#5a5a6e', fontSize: 16, fontWeight: 400 }}>
                  מנהלים פרויקט התחדשות? הכל מתחיל כאן.
                </p>
              </Reveal>

              <Reveal delay={0.15}>
                <div className="flex flex-wrap gap-3 mb-8">
                  <Link
                    to="/register"
                    className="no-underline rounded-[10px] px-6 py-3 transition-opacity hover:opacity-90"
                    style={{ background: '#8b6f47', color: '#fff', fontSize: 15, fontWeight: 600 }}
                  >
                    התחילו בחינם ←
                  </Link>
                  <button
                    onClick={() => scrollTo('process')}
                    className="rounded-[10px] px-6 py-3 border bg-white cursor-pointer transition-colors hover:bg-gray-50"
                    style={{ color: '#3b6b9c', fontSize: 15, fontWeight: 600, borderColor: '#d1d5db' }}
                  >
                    איך זה עובד?
                  </button>
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <div className="flex gap-8 md:gap-10">
                  {[
                    { num: '500+', label: 'בניינים רשומים' },
                    { num: '120+', label: 'פרויקטים פעילים' },
                    { num: '98%', label: 'שביעות רצון' },
                  ].map(s => (
                    <div key={s.num} className="text-center">
                      <div style={{ color: '#1e3a5f', fontSize: 26, fontWeight: 800 }}>{s.num}</div>
                      <div style={{ color: '#8e8e9e', fontSize: 11, fontWeight: 400 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Left column — Search Card */}
            <div className="order-2">
              <Reveal delay={0.1}>
                <div
                  className="bg-white rounded-[18px] shadow-lg overflow-hidden"
                  style={{ padding: 28 }}
                >
                  {/* Top gradient border */}
                  <div
                    className="rounded-t-[18px] -mx-7 -mt-7 mb-6"
                    style={{
                      height: 4,
                      background: 'linear-gradient(to left, #3b6b9c, #8b6f47)',
                      marginLeft: -28,
                      marginRight: -28,
                      marginTop: -28,
                    }}
                  />

                  <h3 className="mb-1" style={{ color: '#212121', fontSize: 18, fontWeight: 700 }}>
                    בדקו את הבניין שלכם
                  </h3>
                  <p className="mb-5" style={{ color: '#8e8e9e', fontSize: 13 }}>
                    הכניסו כתובת וגלו את הפוטנציאל
                  </p>

                  <div className="space-y-4 mb-5">
                    {[
                      { label: 'עיר', placeholder: 'הקלידו עיר...' },
                      { label: 'רחוב', placeholder: 'הקלידו רחוב...' },
                      { label: 'מספר בניין', placeholder: 'הקלידו מספר...' },
                    ].map(f => (
                      <div key={f.label}>
                        <label
                          className="block mb-1"
                          style={{ color: '#5a5a6e', fontSize: 13, fontWeight: 600 }}
                        >
                          {f.label}
                        </label>
                        <input
                          type="text"
                          placeholder={f.placeholder}
                          className="w-full bg-white border rounded-[10px] px-3 outline-none focus:border-[#3b6b9c] transition-colors"
                          style={{ height: 40, borderColor: '#d1d5db', fontSize: 14 }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full rounded-[10px] py-3 border-none cursor-pointer transition-opacity hover:opacity-90"
                    style={{ background: '#8b6f47', color: '#fff', fontSize: 15, fontWeight: 600 }}
                  >
                    בדקו עכשיו ←
                  </button>

                  {/* Info bar */}
                  <div
                    className="mt-4 rounded-lg px-4 py-2 text-center"
                    style={{ background: '#f5f0e8', color: '#8b6f47', fontSize: 11 }}
                  >
                    📊 השבוע 2,235 דיירים קיבלו 7,278 הצעות
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ PROCESS SECTION ═══════════════════ */}
      <section id="process" className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <span
                className="inline-block mb-3 uppercase tracking-widest"
                style={{ color: '#8b6f47', fontSize: 12, fontWeight: 700 }}
              >
                התהליך
              </span>
              <h2 style={{ color: '#212121', fontSize: 30, fontWeight: 800 }}>
                ארבעה שלבים לדירה חדשה
              </h2>
              <GradientUnderline />
            </div>
          </Reveal>

          {/* Steps */}
          <div className="relative">
            {/* Connecting line — desktop only */}
            <div className="hidden md:block absolute top-[38px] right-[10%] left-[10%] h-[2px] bg-[#eeeeee]" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative">
              {[
                { icon: '🔍', num: 1, title: 'נגמרו הניחושים', desc: 'הכניסו כתובת וגלו הרווח הצפוי' },
                { icon: '📐', num: 2, title: 'תוכנית מותאמת', desc: 'נגבש תוכנית ונארגן דיירים' },
                { icon: '✅', num: 3, title: 'מומחים מאומתים', desc: 'יזמים עם ניסיון וחוות דעת' },
                { icon: '🏡', num: 4, title: 'ליווי עד המפתח', desc: 'ליווי דיגיטלי ותיעוד התקדמות' },
              ].map((step, i) => (
                <Reveal key={step.num} delay={i * 0.1}>
                  <div className="flex flex-col items-center text-center">
                    {/* Circle with icon */}
                    <div
                      className="relative bg-white rounded-full flex items-center justify-center shadow-md mb-4"
                      style={{ width: 76, height: 76 }}
                    >
                      <span className="text-2xl">{step.icon}</span>
                      {/* Number badge */}
                      <div
                        className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
                        style={{
                          width: 22,
                          height: 22,
                          background: '#1e3a5f',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {step.num}
                      </div>
                    </div>
                    <h4 className="mb-1" style={{ color: '#212121', fontSize: 14, fontWeight: 700 }}>
                      {step.title}
                    </h4>
                    <p style={{ color: '#8e8e9e', fontSize: 11, fontWeight: 400 }}>
                      {step.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ BENEFITS SECTION ═══════════════════ */}
      <section id="benefits" className="py-20" style={{ background: '#f8f9fa' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <span
                className="inline-block mb-3 uppercase tracking-widest"
                style={{ color: '#8b6f47', fontSize: 12, fontWeight: 700 }}
              >
                היתרונות
              </span>
              <h2 style={{ color: '#212121', fontSize: 28, fontWeight: 800 }}>
                למה Silver Castle?
              </h2>
              <GradientUnderline />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🗳️', title: 'הצבעות חכמות', desc: 'סקרים עם סף אישור ומעקב בזמן אמת', iconBg: '#ebf1f7' },
              { icon: '📋', title: 'ניהול מכרזים', desc: 'הצעות מאנשי מקצוע מדורגים ומאומתים', iconBg: '#f5f0e8' },
              { icon: '✍️', title: 'חתימות דיגיטליות', desc: 'חתימה על חוזים ומסמכים — הכל דיגיטלי', iconBg: '#ebf1f7' },
              { icon: '🔔', title: 'עדכונים שוטפים', desc: 'התראות מיידיות על כל שלב בפרויקט', iconBg: '#f5f0e8' },
              { icon: '💬', title: 'תקשורת מרכזית', desc: 'צ׳אט ישיר, קבוצתי, שידורים ופרוטוקולים', iconBg: '#ebf1f7' },
              { icon: '📊', title: 'שקיפות מלאה', desc: 'דשבורד עם נתוני חתימות וסטטוס', iconBg: '#f5f0e8' },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.06}>
                <div
                  className="bg-white rounded-[14px] p-5 flex items-start gap-4 transition-shadow hover:shadow-md"
                  style={{ minHeight: 140 }}
                >
                  <div
                    className="flex-shrink-0 rounded-[12px] flex items-center justify-center"
                    style={{ width: 48, height: 48, background: card.iconBg }}
                  >
                    <span className="text-xl">{card.icon}</span>
                  </div>
                  <div>
                    <h4 className="mb-1" style={{ color: '#212121', fontSize: 15, fontWeight: 700 }}>
                      {card.title}
                    </h4>
                    <p style={{ color: '#8e8e9e', fontSize: 12, lineHeight: 1.6 }}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ ROLES SECTION ═══════════════════ */}
      <section id="roles" className="py-16" style={{ background: '#1e3a5f' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="mb-2" style={{ color: '#ffffff', fontSize: 26, fontWeight: 800 }}>
                לכל תפקיד — הכלים הנכונים
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                Silver Castle מתאימה את עצמה לכם
              </p>
              <div
                className="mx-auto mt-3 rounded-full"
                style={{ width: 48, height: 3, background: '#a6895f' }}
              />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '🏠', title: 'דייר', desc: 'צפו, חתמו, הצביעו' },
              { icon: '📋', title: 'מארגן', desc: 'ארגנו דיירים, חוזים' },
              { icon: '🔧', title: 'נותן שירות', desc: 'מצאו פרויקטים' },
              { icon: '👑', title: 'יזם', desc: 'גשו למכרזים' },
            ].map((role, i) => (
              <Reveal key={role.title} delay={i * 0.08}>
                <div
                  className="rounded-[14px] p-5 text-center backdrop-blur-sm transition-all hover:bg-white/[0.15]"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    minHeight: 160,
                  }}
                >
                  <div
                    className="mx-auto rounded-[12px] flex items-center justify-center mb-4"
                    style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)' }}
                  >
                    <span className="text-xl">{role.icon}</span>
                  </div>
                  <h4 className="mb-1" style={{ color: '#ffffff', fontSize: 15, fontWeight: 700 }}>
                    {role.title}
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                    {role.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA SECTION ═══════════════════ */}
      <section id="contact" className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <Reveal>
            <h2 className="mb-3" style={{ color: '#212121', fontSize: 26, fontWeight: 800 }}>
              מוכנים להתחיל?
            </h2>
            <p className="mb-8" style={{ color: '#8e8e9e', fontSize: 14 }}>
              הצטרפו לאלפי דיירים שמנהלים התחדשות בצורה חכמה
            </p>
            <Link
              to="/register"
              className="inline-block no-underline rounded-[10px] px-8 py-3 transition-opacity hover:opacity-90"
              style={{ background: '#8b6f47', color: '#fff', fontSize: 14, fontWeight: 600 }}
            >
              צרו חשבון חינם ←
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t py-6" style={{ borderColor: '#eeeeee' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span style={{ color: '#212121', fontSize: 14, fontWeight: 700 }}>Silver Castle</span>
              <span style={{ color: '#8e8e9e', fontSize: 12 }}>© 2026 Silver Castle</span>
            </div>
            <div className="flex gap-6">
              {['תנאי שימוש', 'מדיניות פרטיות', 'צור קשר'].map(l => (
                <a
                  key={l}
                  href="#"
                  className="no-underline hover:text-[#5a5a6e] transition-colors"
                  style={{ color: '#8e8e9e', fontSize: 12 }}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
