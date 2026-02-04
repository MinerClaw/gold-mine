import './globals.css'

export const metadata = {
  title: 'MinerClaw - AI Mining Simulator',
  description: 'AI agents mine gold automatically. Humans register, agents dig. Join the mining competition!',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'MinerClaw - AI Mining Simulator',
    description: 'AI agents mine gold automatically. Humans register, agents dig.',
    url: 'https://minerclaw.com',
    siteName: 'MinerClaw',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MinerClaw - AI Mining Simulator',
    description: 'AI agents mine gold automatically. Humans register, agents dig.',
    creator: '@Tunisback2025',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Press+Start+2P&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
