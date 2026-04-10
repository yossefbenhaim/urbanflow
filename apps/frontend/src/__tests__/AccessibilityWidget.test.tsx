import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/' }),
}))

// Mock CSS module
vi.mock('../components/Accessibility/AccessibilityWidget.module.css', () => ({
  default: new Proxy({}, { get: (_t, prop) => String(prop) }),
}))

import AccessibilityWidget from '../components/Accessibility/AccessibilityWidget'

describe('AccessibilityWidget', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.cssText = ''
    document.body.classList.remove('a11y-hc')
    ;['a11y-links', 'a11y-anim', 'a11y-font', 'a11y-spacing', 'a11y-focus', 'a11y-lh'].forEach(
      id => document.getElementById(id)?.remove()
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the FAB button on landing page', () => {
    render(<AccessibilityWidget />)
    expect(screen.getByLabelText('תפריט נגישות')).toBeInTheDocument()
  })

  it('panel is closed by default', () => {
    render(<AccessibilityWidget />)
    expect(screen.queryByText('⚙️ הגדרות נגישות')).not.toBeInTheDocument()
  })

  it('opens panel when FAB is clicked', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))
    expect(screen.getByText('⚙️ הגדרות נגישות')).toBeInTheDocument()
  })

  it('closes panel when close button is clicked', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))
    expect(screen.getByText('⚙️ הגדרות נגישות')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('סגור'))
    expect(screen.queryByText('⚙️ הגדרות נגישות')).not.toBeInTheDocument()
  })

  it('shows 12 accessibility options in the panel', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    expect(screen.getByText('גודל גופן')).toBeInTheDocument()
    expect(screen.getByText('ניגודיות')).toBeInTheDocument()
    expect(screen.getByText('הפוך צבעים')).toBeInTheDocument()
    expect(screen.getByText('גווני אפור')).toBeInTheDocument()
    expect(screen.getByText('רוויה')).toBeInTheDocument()
    expect(screen.getByText('קו לקישורים')).toBeInTheDocument()
    expect(screen.getByText('ריווח טקסט')).toBeInTheDocument()
    expect(screen.getByText('גובה שורה')).toBeInTheDocument()
    expect(screen.getByText('דיסלקציה')).toBeInTheDocument()
    expect(screen.getByText('סמן גדול')).toBeInTheDocument()
    expect(screen.getByText('הדגשת מיקוד')).toBeInTheDocument()
    expect(screen.getByText('עצור אנימציות')).toBeInTheDocument()
  })

  it('shows counter 0/12 initially', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))
    expect(screen.getByText('0/12')).toBeInTheDocument()
  })

  it('toggles high contrast and updates counter', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('ניגודיות'))
    expect(screen.getByText('1/12')).toBeInTheDocument()
    expect(document.body.classList.contains('a11y-hc')).toBe(true)
  })

  it('cycles font size through 4 levels', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    // Click font size button - need to re-query each time since React re-renders
    function clickFontSize() {
      const btn = screen.getByText('גודל גופן').closest('button')!
      fireEvent.click(btn)
    }

    // Click 1: fontSize = 1 (115%)
    clickFontSize()
    expect(document.documentElement.style.fontSize).toBe('115%')
    expect(screen.getByText('1/12')).toBeInTheDocument()

    // Click 2: fontSize = 2 (130%)
    clickFontSize()
    expect(document.documentElement.style.fontSize).toBe('130%')

    // Click 3: fontSize = 3 (150%)
    clickFontSize()
    expect(document.documentElement.style.fontSize).toBe('150%')

    // Click 4: fontSize = 0 (100%) - cycles back
    clickFontSize()
    expect(document.documentElement.style.fontSize).toBe('100%')
    expect(screen.getByText('0/12')).toBeInTheDocument()
  })

  it('toggles grayscale filter', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('גווני אפור'))
    expect(document.documentElement.style.filter).toContain('grayscale(100%)')
  })

  it('toggles invert colors filter', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('הפוך צבעים'))
    expect(document.documentElement.style.filter).toContain('invert(100%)')
  })

  it('toggles big cursor', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('סמן גדול'))
    expect(document.documentElement.style.cursor).toBe('zoom-in')
  })

  it('injects underline links style', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('קו לקישורים'))
    const injected = document.getElementById('a11y-links')
    expect(injected).not.toBeNull()
    expect(injected?.textContent).toContain('text-decoration: underline')
  })

  it('injects pause animations style', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('עצור אנימציות'))
    const injected = document.getElementById('a11y-anim')
    expect(injected).not.toBeNull()
  })

  it('injects text spacing style', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('ריווח טקסט'))
    expect(document.getElementById('a11y-spacing')).not.toBeNull()
  })

  it('injects line height style', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('גובה שורה'))
    expect(document.getElementById('a11y-lh')).not.toBeNull()
  })

  it('injects dyslexia font style', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('דיסלקציה'))
    expect(document.getElementById('a11y-font')).not.toBeNull()
  })

  it('injects focus highlight style', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('הדגשת מיקוד'))
    expect(document.getElementById('a11y-focus')).not.toBeNull()
  })

  it('saves settings to localStorage', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('ניגודיות'))
    const saved = JSON.parse(localStorage.getItem('sc-a11y') || '{}')
    expect(saved.highContrast).toBe(true)
  })

  it('loads settings from localStorage', () => {
    localStorage.setItem('sc-a11y', JSON.stringify({ highContrast: true }))
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    expect(screen.getByText('1/12')).toBeInTheDocument()
    expect(document.body.classList.contains('a11y-hc')).toBe(true)
  })

  it('resets all settings', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    // Enable a couple of options
    fireEvent.click(screen.getByText('ניגודיות'))
    fireEvent.click(screen.getByText('סמן גדול'))
    expect(screen.getByText('2/12')).toBeInTheDocument()

    // Reset
    fireEvent.click(screen.getByText('איפוס הגדרות'))
    expect(screen.getByText('0/12')).toBeInTheDocument()
    expect(document.body.classList.contains('a11y-hc')).toBe(false)
    expect(document.documentElement.style.cursor).toBe('')
  })

  it('combines multiple filters', () => {
    render(<AccessibilityWidget />)
    fireEvent.click(screen.getByLabelText('תפריט נגישות'))

    fireEvent.click(screen.getByText('גווני אפור'))
    fireEvent.click(screen.getByText('הפוך צבעים'))
    fireEvent.click(screen.getByText('רוויה'))

    const filter = document.documentElement.style.filter
    expect(filter).toContain('grayscale(100%)')
    expect(filter).toContain('invert(100%)')
    expect(filter).toContain('saturate(200%)')
    expect(screen.getByText('3/12')).toBeInTheDocument()
  })

  it('opens via custom event', () => {
    render(<AccessibilityWidget />)
    expect(screen.queryByText('⚙️ הגדרות נגישות')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('open-accessibility'))
    })
    expect(screen.getByText('⚙️ הגדרות נגישות')).toBeInTheDocument()
  })

  it('shows first-visit tooltip when sc-a11y-seen is not set', () => {
    render(<AccessibilityWidget />)
    expect(screen.getByText('יש לך שאלה? אני כאן!')).toBeInTheDocument()
  })

  it('does not show tooltip after first visit', () => {
    localStorage.setItem('sc-a11y-seen', '1')
    render(<AccessibilityWidget />)
    expect(screen.queryByText('יש לך שאלה? אני כאן!')).not.toBeInTheDocument()
  })

  it('renders with dir=rtl', () => {
    const { container } = render(<AccessibilityWidget />)
    expect(container.firstChild).toHaveAttribute('dir', 'rtl')
  })
})
