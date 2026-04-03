import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useScrollAnim } from '../hooks/useScrollAnim'

/* ─── DATA ─── */
const STATS = [
  { num: '500+', label: 'בניינים רשומים', icon: 'M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7H3l2-4h14l2 4M5 21V10.7M19 21V10.7' },
  { num: '12,000+', label: 'דיירים פעילים', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { num: '98%', label: 'שביעות רצון', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { num: '24/7', label: 'תמיכה זמינה', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

const STEPS = [
  { num: '01', title: 'הצטרף לבניין שלך', desc: 'הזן כתובת, אמת את הפרטים שלך ותקבל גישה מיידית לתיק הבניין.', gradient: 'from-sc-primary to-sc-primary-light' },
  { num: '02', title: 'הצביע ועקוב', desc: 'השתתף בהצבעות, עקוב אחר התקדמות הפרויקט ותקשר עם כל הגורמים.', gradient: 'from-sc-navy to-sc-primary' },
  { num: '03', title: 'קבל את הדירה החדשה', desc: 'מהתכנון ועד טופס 4 — Silver Castle מלווה אותך בכל שלב.', gradient: 'from-sc-gold to-sc-gold-dark' },
]

const ROLES = [
  { title: 'דייר', desc: 'עקוב אחרי תהליך ההתחדשות, הצביע בהחלטות חשובות ותקשר עם כל הגורמים במקום אחד.', gradient: 'from-sc-primary to-sc-navy', iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { title: 'גורם מלווה', desc: 'נהל פרויקטים, תאם בין גורמים מקצועיים ופתח מכרזים בצורה שקופה ומסודרת.', gradient: 'from-sc-teal to-sc-primary', iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { title: 'נותן שירות', desc: 'הגש הצעות מחיר, עדכן סטטוס ובנה מוניטין מקצועי מול אלפי דיירים ופרויקטים.', gradient: 'from-sc-success to-sc-teal', iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { title: 'יזם', desc: 'נהל פרויקטי התחדשות, חוזים, ספקי שירות ולוחות זמנים — הכל בפלטפורמה אחת.', gradient: 'from-sc-gold to-sc-gold-dark', iconPath: 'M13 10V3L4 14h7v7l9-11h-7z' },
]

const FEATURES = [
  { title: 'הצבעות דיגיטליות', desc: 'מערכת הצבעה מאובטחת ושקופה לכל ההחלטות.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { title: 'ניהול מכרזים', desc: 'פתח מכרזים, השווה הצעות ובחר נותני שירות בשקיפות.', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { title: 'מסמכים ודוחות', desc: 'כל המסמכים במקום אחד — חוזים, דוחות, פרוטוקולים.', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { title: 'עדכונים בזמן אמת', desc: 'קבל עדכוני סטטוס שבועיים מכל נותני השירות.', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { title: 'תקשורת חכמה', desc: 'צ\'אט ישיר בין דיירים, נציגות ונותני שירות.', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { title: 'אבטחה מקסימלית', desc: 'הצפנה מלאה, אימות זהות ומעקב פעולות ללא מחיקה.', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
]

const HERO_LINES = ['פשוט. שקוף. יחד.', 'ועדיין לא ברור מה קורה?', 'מהמפתח הישן — למפתח החדש.']

const TESTIMONIALS = [
  { name: 'דני כהן', role: 'דייר, תל אביב', text: 'סוף סוף מישהו שם סדר בבלגן. יודע בדיוק מה קורה עם הפרויקט בלי להתקשר לעשרה אנשים.' },
  { name: 'עו"ד מיכל לוי', role: 'עורכת דין, חיפה', text: 'הפלטפורמה חוסכת לי שעות עבודה. כל המסמכים במקום אחד, כל ההצבעות מתועדות.' },
  { name: 'אבי ישראלי', role: 'יזם, ירושלים', text: 'ניהול הפרויקטים נהיה פשוט ושקוף. הדיירים מרוצים וזה מזרז את כל התהליך.' },
]

/* ─── COMPONENTS ─── */

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollAnim()
  return (
    <div
      ref={ref as any}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ${delay}s cubic-bezier(.22,1,.36,1), transform 0.7s ${delay}s cubic-bezier(.22,1,.36,1)`,
      }}
    >
      {children}
    </div>
  )
}

function SvgIcon({ path, className = 'w-6 h-6' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

/* ─── HERO BACKGROUND ─── */
function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number, t = 0
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.1,
    }))

    const draw = () => {
      t += 1
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Gradient orbs
      const orbs = [
        { x: 0.15 + Math.sin(t * 0.0003) * 0.08, y: 0.2 + Math.cos(t * 0.0004) * 0.06, r: 0.5, c: [30, 58, 95] },
        { x: 0.85 + Math.sin(t * 0.0002 + 2) * 0.1, y: 0.7 + Math.cos(t * 0.0003 + 1) * 0.08, r: 0.45, c: [59, 107, 156] },
        { x: 0.5 + Math.sin(t * 0.0004 + 4) * 0.06, y: 0.9, r: 0.4, c: [90, 141, 184] },
      ]
      orbs.forEach(orb => {
        const g = ctx.createRadialGradient(orb.x * W, orb.y * H, 0, orb.x * W, orb.y * H, orb.r * Math.min(W, H))
        g.addColorStop(0, `rgba(${orb.c.join(',')},0.12)`)
        g.addColorStop(0.5, `rgba(${orb.c.join(',')},0.04)`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      })

      // Particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.fillStyle = `rgba(255,255,255,${p.opacity * (0.7 + 0.3 * Math.sin(t * 0.015 + p.x))})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      })

      // Particle connections
      ctx.lineWidth = 0.4
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.strokeStyle = `rgba(59,107,156,${0.06 * (1 - dist / 120)})`
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

/* ─── MAIN LANDING ─── */
export default function Landing() {
  const [textIdx, setTextIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setTextIdx(i => (i + 1) % HERO_LINES.length); setFade(true) }, 350)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div dir="rtl" className="min-h-screen bg-sc-navy text-white overflow-x-hidden font-heebo">

      {/* ── SCROLL PROGRESS ── */}
      <ScrollProgress />

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-sc-navy/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <Link to="/" className="flex items-center gap-2.5 text-white font-extrabold text-lg tracking-tight no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sc-primary to-sc-navy flex items-center justify-center text-xs font-black shadow-lg shadow-sc-primary/25">SC</div>
            <span className="hidden sm:inline">Silver Castle</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {[['#how', 'איך זה עובד'], ['#features', 'יכולות'], ['#roles', 'למי מתאים'], ['#testimonials', 'ממליצים']].map(([href, label]) => (
              <a key={href} href={href} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block px-5 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors no-underline">כניסה</Link>
            <Link to="/register" className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-sc-primary to-sc-navy hover:from-sc-primary-light hover:to-sc-primary text-white no-underline shadow-lg shadow-sc-primary/25 transition-all hover:shadow-sc-primary/40 hover:-translate-y-0.5">הרשמה חינם</Link>
            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 py-4 bg-sc-navy/95 backdrop-blur-2xl border-t border-white/[0.06] space-y-1">
            {[['#how', 'איך זה עובד'], ['#features', 'יכולות'], ['#roles', 'למי מתאים'], ['#testimonials', 'ממליצים']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-base font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">{label}</a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-base font-semibold text-slate-400 no-underline">כניסה</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <HeroBackground />
        {/* Radial top gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sc-navy" />

        <div className="relative z-10 text-center w-full max-w-4xl px-5 md:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-sc-primary/10 border border-sc-primary/20 rounded-full px-5 py-2 mb-8 animate-[fadeDown_0.8s_ease_both]">
            <span className="w-2 h-2 rounded-full bg-sc-primary shadow-[0_0_8px_theme(colors.sc-primary)] animate-pulse" />
            <span className="text-xs font-semibold text-sc-primary-light tracking-wide">פלטפורמת ההתחדשות העירונית #1 בישראל</span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.2rem,7vw,5rem)] font-black leading-[1.05] mb-4 tracking-tight animate-[fadeUp_0.9s_0.1s_ease_both]">
            עשרות מסמכים.
            <br />
            עשרות ישיבות.
          </h1>

          {/* Rotating text */}
          <div className="h-16 md:h-20 flex items-center justify-center mb-6">
            <span
              className="text-[clamp(1.4rem,4.5vw,3rem)] font-black bg-gradient-to-r from-sc-gold via-sc-teal to-sc-primary-light bg-clip-text text-transparent transition-all duration-350"
              style={{ opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(12px)' }}
            >
              {HERO_LINES[textIdx]}
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-xl mx-auto mb-10 animate-[fadeUp_1s_0.2s_ease_both]">
            Silver Castle שמה אותך במרכז — כל עדכון, כל מסמך, כל החלטה — בלחיצה אחת.
          </p>

          {/* CTAs */}
          <div className="flex gap-4 justify-center flex-wrap animate-[fadeUp_1s_0.3s_ease_both]">
            <Link
              to="/register"
              className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-sc-primary to-sc-navy text-white font-extrabold text-base md:text-lg no-underline shadow-[0_8px_32px_rgba(59,107,156,0.35)] hover:shadow-[0_12px_40px_rgba(59,107,156,0.5)] transition-all duration-300 hover:-translate-y-1"
            >
              <span className="flex items-center gap-2">
                התחל עכשיו בחינם
                <svg className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
            </Link>
            <a
              href="#how"
              className="px-8 py-4 rounded-2xl border border-white/10 text-slate-300 font-semibold text-base md:text-lg no-underline bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
            >
              איך זה עובד
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex gap-6 md:gap-8 justify-center flex-wrap mt-10 animate-[fadeUp_1s_0.4s_ease_both]">
            {[
              ['M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', 'מאובטח'],
              ['M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 'ללא כרטיס אשראי'],
              ['M13 10V3L4 14h7v7l9-11h-7z', 'הגדרה תוך 2 דקות'],
            ].map(([path, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={path} /></svg>
                {label}
              </span>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex flex-col items-center gap-2 animate-[fadeUp_1s_0.6s_ease_both]">
            <span className="text-slate-600 text-xs">גלול למטה</span>
            <div className="w-6 h-10 border-2 border-white/10 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-sc-primary rounded-full animate-[scrollDot_1.8s_infinite]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8 text-center hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-sc-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-sc-primary/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-sc-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                      </svg>
                    </div>
                    <div className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">{s.num}</div>
                    <div className="text-xs md:text-sm text-slate-500 mt-2 font-medium">{s.label}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="relative py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block bg-sc-teal/10 border border-sc-teal/20 rounded-full px-5 py-1.5 text-xs font-bold text-sc-teal tracking-widest uppercase mb-5">תהליך</span>
              <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black tracking-tight">שלושה שלבים פשוטים</h2>
              <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm md:text-base">מההרשמה ועד קבלת המפתח — הכל שקוף, מסודר ודיגיטלי.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 md:gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.12}>
                <div className="group relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-white/[0.12] transition-all duration-500 h-full">
                  {/* Glow effect on hover */}
                  <div className={`absolute -inset-px rounded-3xl bg-gradient-to-b ${s.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 blur-sm`} />
                  <div className="relative">
                    {/* Step number */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} mb-6 shadow-lg`}>
                      <span className="text-white font-black text-lg">{s.num}</span>
                    </div>
                    {/* Connector line (hidden on mobile) */}
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:block absolute top-7 -left-8 w-8 border-t-2 border-dashed border-white/[0.08]" />
                    )}
                    <h3 className="text-xl font-extrabold mb-3">{s.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative py-20 md:py-28">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sc-primary/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 md:px-8 relative">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block bg-sc-primary/10 border border-sc-primary/20 rounded-full px-5 py-1.5 text-xs font-bold text-sc-primary-light tracking-widest uppercase mb-5">יכולות</span>
              <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black tracking-tight">כל מה שצריך — במקום אחד</h2>
              <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm md:text-base">כלים מתקדמים לניהול תהליך ההתחדשות העירונית.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-400 h-full">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sc-primary/15 to-sc-navy/15 border border-white/[0.06] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-400">
                    <SvgIcon path={f.icon} className="w-5 h-5 text-sc-primary-light" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" className="relative py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block bg-sc-success/10 border border-sc-success/20 rounded-full px-5 py-1.5 text-xs font-bold text-sc-success tracking-widest uppercase mb-5">משתמשים</span>
              <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black tracking-tight">למי זה מתאים?</h2>
              <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm md:text-base">כל בעל תפקיד בתהליך ההתחדשות מקבל ממשק מותאם.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.1}>
                <div className="group relative rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 md:p-8 overflow-hidden hover:border-white/[0.12] transition-all duration-500 h-full">
                  {/* Background gradient blob */}
                  <div className={`absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br ${r.gradient} rounded-full opacity-[0.06] group-hover:opacity-[0.12] blur-2xl transition-opacity duration-500`} />
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-400`}>
                      <SvgIcon path={r.iconPath} className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-extrabold mb-3">{r.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="relative py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block bg-sc-gold/100/10 border border-sc-gold/20 rounded-full px-5 py-1.5 text-xs font-bold text-sc-gold tracking-widest uppercase mb-5">המלצות</span>
              <h2 className="text-[clamp(1.8rem,5vw,3rem)] font-black tracking-tight">מה אומרים עלינו</h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 h-full">
                  {/* Quote mark */}
                  <div className="text-4xl font-serif text-sc-primary/20 leading-none mb-3">"</div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sc-primary to-sc-navy flex items-center justify-center text-sm font-bold">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section id="cta" className="relative py-24 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sc-primary/[0.08] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sc-navy/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <Reveal>
          <div className="relative max-w-2xl mx-auto text-center px-5">
            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-10 md:p-16">
              <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-black tracking-tight mb-4">
                מוכן להתחיל?
              </h2>
              <p className="text-slate-400 text-base md:text-lg mb-10 leading-relaxed max-w-md mx-auto">
                הצטרף לאלפי דיירים שכבר מנהלים את תהליך ההתחדשות שלהם בצורה חכמה ושקופה.
              </p>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-sc-primary to-sc-navy text-white font-extrabold text-lg no-underline shadow-[0_10px_40px_rgba(59,107,156,0.4)] hover:shadow-[0_14px_48px_rgba(59,107,156,0.55)] transition-all duration-300 hover:-translate-y-1"
              >
                הרשמה חינם עכשיו
                <svg className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <p className="text-slate-600 text-xs mt-6">ללא כרטיס אשראי • ללא התחייבות • הגדרה תוך 2 דקות</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sc-primary to-sc-navy flex items-center justify-center text-[10px] font-black">SC</div>
              <span className="font-bold text-sm">Silver Castle</span>
              <span className="text-slate-600 text-xs mr-3">מתחדשים יחד</span>
            </div>
            <div className="flex gap-8">
              {['פרטיות', 'תנאי שימוש', 'צור קשר'].map(l => (
                <a key={l} href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors no-underline">{l}</a>
              ))}
            </div>
            <p className="text-slate-600 text-xs">© 2026 Silver Castle. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>

      {/* ── GLOBAL CSS ── */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:none } }
        @keyframes scrollDot { 0%{opacity:1;transform:translateY(0)} 80%{opacity:0;transform:translateY(12px)} 100%{opacity:0;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

/* ── SCROLL PROGRESS BAR ── */
function ScrollProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      setPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="fixed top-0 inset-x-0 h-[3px] z-[200] bg-white/[0.05]">
      <div
        className="h-full bg-gradient-to-l from-sc-primary via-sc-primary-light to-sc-gold-dark rounded-l-full"
        style={{ width: `${pct}%`, transition: 'width 0.1s linear' }}
      />
    </div>
  )
}
