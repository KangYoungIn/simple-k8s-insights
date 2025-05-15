import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <main style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '20px',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      {children}
    </main>
  )
}
