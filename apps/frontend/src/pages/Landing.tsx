import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import HeroBg from '../components/HeroBg'
import { useScrollAnim } from '../hooks/useScrollAnim'

const STATS = [
  { num: '500+', label: 'בניינים רשומים', icon: '🏢' },
  { num: '12,000+', label: 'דיירים פעילים', icon: '👥' },
  { num: '98%', label: 'שביעות רצון', icon: '⭐' },
  { num: '6 שבועות', label: 'עד MVP', icon: '🚀' },
]
const STEPS = [
  { num: '01', icon: '🏠', title: 'הצטרף לבניין שלך', desc: 'תהליך פשוט ומהיר — הזן כתובת, אמת פרטים ואתה בפנים.' },
  { num: '02', icon: '🗳️', title: 'הצביע ועקוב', desc: 'השתתף בסקרים, קבל עדכונים בזמן אמת ותקשר עם הוועד.' },
  { num: '03', icon: '🏆', title: 'קבל את הדירה החדשה', desc: 'מblueprint ועד טופס 4 — Silver Castle לצידך בכל שלב.' },
]
const ROLES = [
  { icon: '👤', title: 'דייר', color: '#3B82F6', desc: 'עקוב, הצביע ותקשר עם כל הגורמים.' },
  { icon: '🧭', title: 'גורם מלווה', color: '#8B5CF6', desc: 'נהל פרויקט, תאם גורמים ופתח מכרזים.' },
  { icon: '🏗️', title: 'נותן שירות', color: '#10B981', desc: 'הגש הצעות, עדכן סטטוס ובנה מוניטין.' },
  { icon: '🧑‍💼', title: 'יזם', color: '#F59E0B', desc: 'נהל פרויקטים, חוזים וספקי שירות.' },
]
const HERO_LINES = ['פשוט. שקוף. יחד.', 'ועדיין לא ברור מה קורה?', 'מהמפתח הישן למפתח החדש.']

// Animated section wrapper
function Reveal({ children, delay = 0, from = 'bottom' }: { children: React.ReactNode; delay?: number; from?: 'bottom' | 'left' | 'right' | 'scale' }) {
  const { ref, visible } = useScrollAnim()
  const transforms: Record<string, string> = {
    bottom: 'translateY(40px)',
    left: 'translateX(-40px)',
    right: 'translateX(40px)',
    scale: 'scale(0.9)',
  }
  return (
    <div ref={ref as any} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : transforms[from],
      transition: `opacity 0.7s ${delay}s cubic-bezier(.22,1,.36,1), transform 0.7s ${delay}s cubic-bezier(.22,1,.36,1)`,
    }}>
      {children}
    </div>
  )
}

export default function Landing() {
  const [textIdx, setTextIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setTextIdx(i => (i + 1) % HERO_LINES.length); setFade(true) }, 350)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  const S: React.CSSProperties = { fontFamily: 'system-ui, Arial, sans-serif' }

  return (
    <div dir="rtl" style={{ ...S, minHeight: '100vh', background: '#020817', color: '#F8FAFC', overflowX: 'hidden' }}>

      {/* ── SCROLL PROGRESS BAR ── */}
      <ScrollProgress />

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(2,8,23,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 60 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'white', fontWeight: 800, fontSize: 18 }}>
            <img src="/logo.svg" alt="SC" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
            
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/login" className="desktop-only" style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', color: '#CBD5E1', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>כניסה</Link>
            <Link to="/register" style={{ padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>הרשמה</Link>
            <button onClick={() => setMenuOpen(o => !o)} className="hamburger" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ width: 22, height: 2, background: 'currentColor', borderRadius: 2, transition: 'all .3s', transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
              <span style={{ width: 22, height: 2, background: 'currentColor', borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: 'all .3s' }} />
              <span style={{ width: 22, height: 2, background: 'currentColor', borderRadius: 2, transition: 'all .3s', transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ background: 'rgba(2,8,23,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[['#how', 'כיצד זה עובד'], ['#roles', 'למי זה מתאים'], ['#cta', 'צור קשר']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: '#CBD5E1', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{label}</a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '12px 0' }}>כניסה</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingTop: 60 }}>
        <HeroBg />
        <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: 860, padding: '0 20px', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)', borderRadius: 100, padding: '6px 16px', marginBottom: 28, fontSize: 12, color: '#93C5FD', fontWeight: 600, animation: 'fadeDown 0.8s ease both' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', display: 'inline-block', boxShadow: '0 0 8px #3B82F6', animation: 'pulse 2s infinite' }} />
            פלטפורמת התחדשות עירונית #1 בישראל
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 8vw, 82px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 12px', letterSpacing: -1.5, animation: 'fadeUp 0.9s 0.1s ease both' }}>
            עשרות מסמכים.<br />עשרות ישיבות.
          </h1>
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 'clamp(22px, 5vw, 46px)', fontWeight: 900, background: 'linear-gradient(135deg, #F59E0B, #EF4444, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.35s, transform 0.35s', display: 'block' }}>
              {HERO_LINES[textIdx]}
            </span>
          </div>
          <p style={{ fontSize: 'clamp(15px, 2.5vw, 19px)', color: '#94A3B8', lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 520, animation: 'fadeUp 1s 0.2s ease both' }}>
            Silver Castle שמה אותך במרכז — כל עדכון, כל מסמך, כל החלטה — בלחיצה אחת.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 1s 0.3s ease both' }}>
            <Link to="/register" style={{ padding: '14px 32px', borderRadius: 12, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: 'white', textDecoration: 'none', fontWeight: 800, fontSize: 'clamp(14px,2vw,17px)', boxShadow: '0 8px 28px rgba(37,99,235,0.4)' }}>התחל עכשיו בחינם ←</Link>
            <a href="#how" style={{ padding: '14px 32px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', color: '#CBD5E1', textDecoration: 'none', fontWeight: 600, fontSize: 'clamp(14px,2vw,17px)', background: 'rgba(255,255,255,0.04)' }}>איך זה עובד ↓</a>
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 1s 0.4s ease both' }}>
            {['🔒 מאובטח', '✅ ללא כרטיס אשראי', '⚡ 2 דקות הגדרה'].map(t => (
              <span key={t} style={{ color: '#475569', fontSize: 12, fontWeight: 500 }}>{t}</span>
            ))}
          </div>
          {/* Scroll indicator */}
          <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'fadeUp 1s 0.6s ease both' }}>
            <span style={{ color: '#334155', fontSize: 12 }}>גלול למטה</span>
            <div style={{ width: 24, height: 40, border: '2px solid rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
              <div style={{ width: 4, height: 8, background: '#3B82F6', borderRadius: 2, animation: 'scrollDot 1.8s infinite' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ padding: '0 20px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} from="bottom">
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: '64px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 100, padding: '4px 16px', fontSize: 11, color: '#A78BFA', fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>תהליך</span>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>שלושה שלבים פשוטים</h2>
          </div>
        </Reveal>
        <div className="steps-grid" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.num} delay={i * 0.12} from={i % 2 === 0 ? 'left' : 'right'}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0F172A', border: '2px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 0 16px rgba(37,99,235,0.3)' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>{s.num}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>{s.title}</h3>
                  <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" style={{ padding: '64px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 100, padding: '4px 16px', fontSize: 11, color: '#34D399', fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>משתמשים</span>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>למי זה מתאים?</h2>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.1} from="scale">
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.color}30`, borderRadius: 20, padding: '28px 22px', position: 'relative', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: `${r.color}12`, filter: 'blur(16px)' }} />
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{r.icon}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: r.color }}>{r.title}</h3>
                  <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" style={{ padding: '80px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Reveal from="scale">
          <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: -1 }}>מוכן להתחיל?</h2>
            <p style={{ color: '#64748B', fontSize: 'clamp(15px,2vw,18px)', marginBottom: 36, lineHeight: 1.7 }}>הצטרף לאלפי דיירים שכבר מנהלים את תהליך ההתחדשות שלהם בצורה חכמה.</p>
            <Link to="/register" style={{ display: 'inline-block', padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: 'white', textDecoration: 'none', fontWeight: 800, fontSize: 'clamp(15px,2vw,18px)', boxShadow: '0 10px 32px rgba(37,99,235,0.45)' }}>
              הרשמה חינם עכשיו ←
            </Link>
            <p style={{ color: '#334155', fontSize: 12, marginTop: 16 }}>ללא כרטיס אשראי • ללא התחייבות • הגדרה תוך 2 דקות</p>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
            <img src="/logo.svg" alt="SC" style={{ height: 22 }} />Silver Castle
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['פרטיות', 'תנאי שימוש', 'צור קשר'].map(l => <a key={l} href="#" style={{ color: '#475569', textDecoration: 'none', fontSize: 13 }}>{l}</a>)}
          </div>
          <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>© 2026 Silver Castle</p>
        </div>
      </footer>

      {/* ── CSS ── */}
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 8px #3B82F6} 50%{box-shadow:0 0 18px #3B82F6,0 0 30px #3B82F620} }
        @keyframes scrollDot { 0%{opacity:1;transform:translateY(0)} 80%{opacity:0;transform:translateY(12px)} 100%{opacity:0;transform:translateY(0)} }
        @media (min-width: 768px) {
          .hamburger { display: none !important; }
          .desktop-nav { display: flex !important; }
          .desktop-only { display: block !important; }
          .stats-grid { grid-template-columns: repeat(4,1fr) !important; }
          .steps-grid { flex-direction: row !important; }
        }
      `}</style>
    </div>
  )
}

// Scroll progress bar
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
  return <div style={{ position: 'fixed', top: 0, right: 0, left: 0, height: 3, zIndex: 200, background: 'rgba(255,255,255,0.05)' }}>
    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #2563EB, #7C3AED, #F59E0B)', transition: 'width 0.1s linear', borderRadius: '0 2px 2px 0' }} />
  </div>
}
