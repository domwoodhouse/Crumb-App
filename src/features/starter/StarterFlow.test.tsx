import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { starterRepository } from '../../db/repositories/starterRepository'
import { db } from '../../db/db'
import { FeedFormPage } from './FeedFormPage'
import { NewStarterPage } from './NewStarterPage'
import { StarterDetailPage } from './StarterDetailPage'
import { StarterListPage } from './StarterListPage'

function renderStarterRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/starter" element={<StarterListPage />} />
        <Route path="/starter/new" element={<NewStarterPage />} />
        <Route path="/starter/:starterId" element={<StarterDetailPage />} />
        <Route path="/starter/:starterId/feed" element={<FeedFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// All starter pages share the app-wide `db` singleton, so clear it between tests instead
// of giving each test its own CrumbDB instance — that's what keeps this test isolated.
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('starter tracking flow', () => {
  it('creates a starter, logs a feed, marks it peaked, and the history persists across a remount', async () => {
    const { unmount } = renderStarterRoutes('/starter')

    expect(await screen.findByText(/no starters yet/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: /new starter/i }))

    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: 'Doughy' } })
    fireEvent.click(screen.getByRole('button', { name: /create starter/i }))

    expect(await screen.findByRole('heading', { name: 'Doughy' })).toBeInTheDocument()
    expect(screen.getByText(/no feedings logged yet/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: /feed/i }))

    expect(await screen.findByRole('heading', { name: /feed doughy/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '1:5:5' }))
    fireEvent.click(screen.getByRole('button', { name: /log feed/i }))

    expect(await screen.findByRole('heading', { name: 'Doughy' })).toBeInTheDocument()
    expect(screen.getByText('1:5:5')).toBeInTheDocument()

    const markPeakedButton = screen.getByRole('button', { name: /mark peaked/i })
    fireEvent.click(markPeakedButton)

    expect(await screen.findByText(/peaked after/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark peaked/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'doubled' }))
    expect(await screen.findByText(/peaked after.*doubled/i)).toBeInTheDocument()

    // Simulate "reload" by unmounting and re-rendering straight at the detail route —
    // anything still visible came from storage, not lingering component state.
    const [starter] = await starterRepository.getAll()
    unmount()
    renderStarterRoutes(`/starter/${starter.id}`)

    expect(await screen.findByRole('heading', { name: 'Doughy' })).toBeInTheDocument()
    expect(screen.getByText('1:5:5')).toBeInTheDocument()
    expect(screen.getByText(/peaked after.*doubled/i)).toBeInTheDocument()
  })

  it('shows the new starter in the list with its status line', async () => {
    const { unmount } = renderStarterRoutes('/starter')

    fireEvent.click(await screen.findByRole('link', { name: /new starter/i }))
    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: 'Rye Guy' } })
    fireEvent.click(screen.getByRole('button', { name: /create starter/i }))
    await screen.findByRole('heading', { name: 'Rye Guy' })

    fireEvent.click(screen.getByRole('link', { name: /feed/i }))
    await screen.findByRole('heading', { name: /feed rye guy/i })
    fireEvent.click(screen.getByRole('button', { name: /log feed/i }))
    await screen.findByRole('heading', { name: 'Rye Guy' })

    unmount()
    renderStarterRoutes('/starter')

    const listItem = (await screen.findByRole('link', { name: /rye guy/i })).closest('a')
    expect(listItem).not.toBeNull()
    expect(await within(listItem as HTMLElement).findByText(/fed .* ago/i)).toBeInTheDocument()
  })
})
