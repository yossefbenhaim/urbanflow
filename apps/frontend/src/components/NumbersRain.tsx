import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  speed: number
  value: string
  opacity: number
  size: number
  color: string
}

const SYMBOLS = [
  '500','12K','98%','04','תב"ע','01','בניין','03',
  '100','דייר','82%','6W','🏠','77','תמ"א','4',
  '2025','נכס','23','פרויקט','512','91%','⚡','38',
]

const COLORS = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#1d4ed8']

export default function NumbersRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: Particle[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // init particles
    for (let i = 0; i < 55; i++) {
      particles.push(spawn(canvas.width, canvas.height, true))
    }

    function spawn(w: number, h: number, randomY = false): Particle {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + 20,
        speed: 0.5 + Math.random() * 1.8,
        value: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        opacity: 0.08 + Math.random() * 0.28,
        size: 11 + Math.floor(Math.random() * 18),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        ctx!.globalAlpha = p.opacity
        ctx!.fillStyle = p.color
        ctx!.font = `${p.size}px 'Heebo', sans-serif`
        ctx!.textAlign = 'center'
        ctx!.fillText(p.value, p.x, p.y)

        p.y -= p.speed
        p.opacity += 0.001

        if (p.y < -30) {
          const np = spawn(canvas!.width, canvas!.height, false)
          Object.assign(p, np)
        }
      }

      ctx!.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
