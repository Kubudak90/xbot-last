import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'XBot - AI-Powered X Automation',
  description: 'Intelligent tweet generation and automation tool with style analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
