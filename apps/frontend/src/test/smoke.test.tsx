import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Frontend smoke test', () => {
  it('vitest is working', () => {
    expect(1 + 1).toBe(2)
  })

  it('jsdom environment is available', () => {
    expect(document).toBeDefined()
    expect(window).toBeDefined()
  })

  it('react testing library renders a component', () => {
    function Hello() {
      return <div>Hello UrbanFlow</div>
    }
    render(<Hello />)
    expect(screen.getByText('Hello UrbanFlow')).toBeInTheDocument()
  })
})
