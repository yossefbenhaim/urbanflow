import { useEffect, useRef } from 'react'

export default function HeroBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Particles
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }))

    // Orbs config
    const orbs = [
      { x: 0.2, y: 0.3, r: 0.45, color: [37, 99, 235], speed: 0.0004, phase: 0 },
      { x: 0.8, y: 0.6, r: 0.4, color: [124, 58, 237], speed: 0.0003, phase: 2 },
      { x: 0.5, y: 0.85, r: 0.35, color: [16, 185, 129], speed: 0.0005, phase: 4 },
      { x: 0.6, y: 0.15, r: 0.3, color: [245, 158, 11], speed: 0.00035, phase: 1 },
    ]

    const draw = () => {
      t += 1
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      // Dark base
      ctx.fillStyle = '#020817'
      ctx.fillRect(0, 0, W, H)

      // Aurora orbs
      orbs.forEach(orb => {
        const ox = orb.x + Math.sin(t * orb.speed + orb.phase) * 0.12
        const oy = orb.y + Math.cos(t * orb.speed * 1.3 + orb.phase) * 0.08
        const x = ox * W, y = oy * H
        const radius = orb.r * Math.min(W, H)

        const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
        const [r, gb, b] = orb.color
        g.addColorStop(0, `rgba(${r},${gb},${b},0.18)`)
        g.addColorStop(0.4, `rgba(${r},${gb},${b},0.08)`)
        g.addColorStop(1, `rgba(${r},${gb},${b},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      })

      // Grid
      const gridSize = 60
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Grid dots at intersections (sparse)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      for (let x = 0; x < W; x += gridSize) {
        for (let y = 0; y < H; y += gridSize) {
          if ((x / gridSize + y / gridSize) % 3 === 0) {
            ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill()
          }
        }
      }

      // Particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.02 + p.x)
        ctx.fillStyle = `rgba(255,255,255,${p.opacity * pulse})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      })

      // Connect nearby particles
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 100)})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Bottom fade
      const fadeH = ctx.createLinearGradient(0, H * 0.6, 0, H)
      fadeH.addColorStop(0, 'rgba(2,8,23,0)')
      fadeH.addColorStop(1, 'rgba(2,8,23,1)')
      ctx.fillStyle = fadeH
      ctx.fillRect(0, 0, W, H)

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}
