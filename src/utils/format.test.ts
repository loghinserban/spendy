import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { formatCurrency } from './format'

describe('formatCurrency', () => {
  it('formats values as Romanian leu', () => {
    expect(formatCurrency(1234.5)).toMatch(/RON/)
    expect(formatCurrency(0)).toMatch(/RON/)
  })
})


