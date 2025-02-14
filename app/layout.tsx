import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'steph chart',
  description: 'Created with love, by Kev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
