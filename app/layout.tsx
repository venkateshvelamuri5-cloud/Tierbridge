import type { Metadata, Viewport } from 'next'
import './globals.css'

const title = 'TierBridge · Verified jobs and a daily brief for your branch'
const description = 'A free 3-minute daily brief for Indian engineering students: one skill to learn, the tech news that matters to your branch, and verified fresher jobs.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://tierbridge.in'),
  title,
  description,
  keywords: [
    'TierBridge', 'fresher jobs', 'engineering students India', 'daily career brief', 'verified jobs',
    'ECE jobs', 'mechanical fresher jobs', 'civil fresher jobs', 'CSE fresher jobs', 'internships', 'job scam alerts',
  ],
  openGraph: { title, description, url: '/', siteName: 'TierBridge', locale: 'en_IN', type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1220',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
