import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { mockMatchMedia } from './helpers'

mockMatchMedia()

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ''
  vi.unstubAllGlobals()
  mockMatchMedia()
})
