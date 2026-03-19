import { useEffect, useRef, useState } from 'react'

export function useScrollAnim(threshold = 0.15) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting)
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}
