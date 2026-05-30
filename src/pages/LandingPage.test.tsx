import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('navigates to dashboard when Go to Dashboard is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<div>Dashboard Route Reached</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Go to Dashboard' }))

    expect(screen.getByText('Dashboard Route Reached')).toBeInTheDocument()
  })
})

