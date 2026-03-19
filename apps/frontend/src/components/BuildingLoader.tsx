export default function BuildingLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.5 : size === 'lg' ? 0.9 : 0.7

  const buildings = [
    { h: 44, d: '0s'    },
    { h: 66, d: '0.12s' },
    { h: 84, d: '0.06s' },
    { h: 110, d: '0.18s'},
    { h: 130, d: '0.09s'},
    { h: 110, d: '0.15s'},
    { h: 84,  d: '0.21s'},
    { h: 60,  d: '0.03s'},
    { h: 40,  d: '0.24s'},
  ]

  const W = Math.round(14 * scale)
  const gap = Math.round(4 * scale)

  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap }}>
      <style>{`
        @keyframes bldBounce {
          0%, 100% { transform: scaleY(0.45); opacity: 0.6; }
          50%       { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
      {buildings.map((b, i) => {
        const h = Math.round(b.h * scale)
        const windows = Math.max(1, Math.floor(h / Math.round(16 * scale)))
        return (
          <div key={i} style={{
            width: W, height: h,
            position: 'relative',
            transformOrigin: 'bottom',
            animation: `bldBounce 1.1s ease-in-out infinite`,
            animationDelay: b.d,
          }}>
            {/* Building */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, #60a5fa 0%, #1d4ed8 100%)',
              borderRadius: `${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0 0`,
            }} />
            {/* Windows */}
            {Array.from({ length: windows }).map((_, row) => (
              <div key={row} style={{
                position: 'absolute',
                top: Math.round(5 * scale) + row * Math.round(14 * scale),
                left: '15%', right: '15%',
                height: Math.round(5 * scale),
                background: 'rgba(255,255,255,0.75)',
                borderRadius: 1,
              }} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
