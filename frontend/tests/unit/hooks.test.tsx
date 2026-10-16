import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/client'
import { ThemeToggle } from '../../src/components/common/ThemeToggle'
import { useAsyncAction } from '../../src/hooks/useAsyncAction'
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue'
import { useEscapeKey } from '../../src/hooks/useEscapeKey'
import { BoardProvider } from '../../src/state/BoardContext'
import { ThemeProvider } from '../../src/state/ThemeContext'
import { useBoardData } from '../../src/state/useBoardData'
import { useTheme } from '../../src/state/useTheme'
import { mockMatchMedia } from './helpers'

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('only emits the latest value after the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    })
    rerender({ value: 'ab' })
    rerender({ value: 'abc' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('abc')
  })
})

describe('useEscapeKey', () => {
  it('fires on Escape only and stops after unmount', () => {
    const onEscape = vi.fn()
    const { unmount } = renderHook(() => useEscapeKey(onEscape))
    fireEvent.keyDown(document, { key: 'Enter' })
    fireEvent.keyDown(document, { key: 'Escape' })
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})

describe('useAsyncAction', () => {
  it('shows API messages, falls back to a generic one, and clears on success', async () => {
    const { result } = renderHook(() => useAsyncAction('Something went wrong'))

    await act(() => result.current.run(() => Promise.reject(new ApiError(409, 'Name taken'))))
    expect(result.current.error).toBe('Name taken')

    await act(() => result.current.run(() => Promise.reject(new Error('boom'))))
    expect(result.current.error).toBe('Something went wrong')

    await act(() => result.current.run(() => Promise.resolve()))
    expect(result.current.error).toBeNull()
  })
})

describe('theme', () => {
  function ThemeProbe() {
    return <span data-testid="theme">{useTheme().theme}</span>
  }

  it('starts in light mode on the first visit, even if the OS prefers dark', () => {
    mockMatchMedia(true)
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('restores a saved dark choice and persists toggles', async () => {
    localStorage.setItem('flowdesk-theme', 'dark')
    render(
      <ThemeProvider>
        <ThemeProbe />
        <ThemeToggle />
      </ThemeProvider>,
    )
    expect(document.documentElement).toHaveClass('dark')

    await userEvent.click(screen.getByLabelText('Toggle dark mode'))
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(localStorage.getItem('flowdesk-theme')).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('throws a clear error when used outside its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ThemeProbe />)).toThrow('useTheme must be used within a ThemeProvider')
  })
})

describe('board data', () => {
  it('loads every catalog once on mount', async () => {
    const payloads: Record<string, unknown> = {
      '/api/columns': [{ id: 1, name: 'New' }],
      '/api/tags': [],
      '/api/priorities': [],
      '/api/task-types': [],
      '/api/reporters': [{ id: 5, name: 'Ann' }],
      '/api/settings': { external_reference_base_url: 'https://x' },
    }
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => payloads[url] }))
    vi.stubGlobal('fetch', fetchMock)

    function Probe() {
      const { loading, columns, reporters, settings } = useBoardData()
      return <span data-testid="board">{loading ? 'loading' : `${columns.length}/${reporters[0]?.name}/${settings.external_reference_base_url}`}</span>
    }
    render(
      <BoardProvider>
        <Probe />
      </BoardProvider>,
    )

    expect(await screen.findByText('1/Ann/https://x')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual(Object.keys(payloads).sort())
  })
})
