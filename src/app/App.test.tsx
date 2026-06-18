import { render, screen } from '@testing-library/react'
import { App } from './App'

it('renders the home page and bottom nav by default', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Starter' })).toBeInTheDocument()
})
