'use client'

import ErrorBoundary from '../src/components/ErrorBoundary'
import { AuthProvider } from '../src/lib/auth'
import { ThemeProvider } from '../src/lib/theme'

/* Semua penyedia konteks berkumpul di satu berkas klien, supaya app/layout.jsx
   tetap menjadi komponen server dan bisa mengatur <html>, metadata, serta
   skrip tema. */
export default function Penyedia({ children }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
