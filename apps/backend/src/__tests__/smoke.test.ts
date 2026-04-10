import { describe, it, expect } from 'vitest'

describe('Backend smoke test', () => {
  it('vitest is working', () => {
    expect(1 + 1).toBe(2)
  })

  it('can import zod and validate', () => {
    const { z } = require('zod')
    const schema = z.object({ name: z.string() })
    const result = schema.safeParse({ name: 'test' })
    expect(result.success).toBe(true)
  })

  it('environment is node', () => {
    expect(typeof process).toBe('object')
    expect(typeof window).toBe('undefined')
  })
})
