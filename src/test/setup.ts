import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

URL.createObjectURL = vi.fn(() => 'blob:mock-object-url')
URL.revokeObjectURL = vi.fn()
