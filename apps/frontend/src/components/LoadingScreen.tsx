import { useEffect, useState } from 'react'

const BUILDINGS = [
  { w: 20, h: 44,  d: 0.00 },
  { w: 20, h: 66,  d: 0.08 },
  { w: 20, h: 84,  d: 0.04 },
  { w: 20, h: 106, d: 0.00 },
  { w: 22, h: 122, d: 0.02 },
  { w: 20, h: 106, d: 0.04 },
  { w: 20, h: 84,  d: 0.06 },
  { w: 20, h: 62,  d: 0.10 },
  { w: 20, h: 40,  d: 0.12 },
]

export default function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Trigger entry animation
    requestAnimationFrame(() => setMounted(true))
    // Auto-dismiss after 600ms if onDone provided
    if (onDone) {
      const t = setTimeout(() => {
        setFadeOut(true)
        setTimeout(onDone, 200)
      }, 600)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.2s ease',
    }}>
      <style>{`
        @keyframes riseBuilding {
          0%   { transform: scaleY(0);   opacity: 0; }
          60%  { transform: scaleY(1.06); opacity: 1; }
          80%  { transform: scaleY(0.97); }
          100% { transform: scaleY(1);   opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerSlide {
          0%   { left: -40%; }
          100% { left: 110%; }
        }
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0);   opacity: 0.4; }
          50%       { transform: translateY(-8px); opacity: 1;   }
        }

      `}</style>

      {/* Cityscape */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 0,
        position: 'relative',
      }}>
        {BUILDINGS.map((b, i) => {
          const windows = Math.floor(b.h / 30)
          return (
            <div key={i} style={{
              width: b.w, height: b.h,
              position: 'relative',
              transformOrigin: 'bottom',
              animation: mounted ? `riseBuilding 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards` : 'none',
              animationDelay: `${(b.d + i * 0.05) * 0.5}s`,
              opacity: 0,
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(96,165,250,0.85)',
                borderRadius: '4px 4px 0 0',
                boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.15)',
              }} />
              {Array.from({ length: windows }).map((_, row) =>
                [0, 1].map(col => (
                  <div key={`${row}-${col}`} style={{
                    position: 'absolute',
                    top: 12 + row * 28,
                    left: col === 0 ? '15%' : '55%',
                    width: '22%', height: 10,
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: 2,
                  }} />
                ))
              )}
            </div>
          )
        })}
      </div>



      {/* Logo text */}
      <div style={{
        textAlign: 'center',
        animation: mounted ? 'fadeInUp 0.25s ease forwards' : 'none',
        animationDelay: '0.2s',
        opacity: 0,
      }}>
        <div style={{
          position: 'relative', display: 'inline-block',
          fontSize: 22, fontWeight: 800, color: 'white',
          letterSpacing: 2, overflow: 'hidden',
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}>
          Silver Castle
          <div style={{
            position: 'absolute', top: 0, bottom: 0, width: '35%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            animation: 'shimmerSlide 1.8s ease-in-out infinite',
            animationDelay: '1s',
          }} />
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,0.7)',
          letterSpacing: 4, marginTop: 5,
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}>
          מתחדשים יחד
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 24,
        animation: mounted ? 'fadeInUp 0.2s ease forwards' : 'none',
        animationDelay: '0.3s',
        opacity: 0,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'white', opacity: 0.6,
            animation: 'dotBounce 0.9s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  )
}
