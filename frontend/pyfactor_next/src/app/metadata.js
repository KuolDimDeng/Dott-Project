// src/app/metadata.js

export const metadata = {
  title: 'Dott: Small Business Platform',
  description: 'Dott is a small business solutions app that helps small businesses manage their business operations effectively.',
  themeColor: '#1976d2',

  icons: {
    icon: [
      {
        url: '/static/images/favicon.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
        shortcut: '/static/images/favicon.png',
    apple: '/static/images/favicon.png',
    other: {
      rel: 'apple-touch-icon',
      url: '/static/images/favicon.png',
    },
  },
  manifest: '/static/manifest.json',
  openGraph: {
    title: 'Dott: Small Business Platform',
    description: 'Dott is a small business solutions app that helps small businesses manage their business operations effectively.',
    images: [
      {
        url: '/static/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pyfactor Platform',
      }
    ],
    locale: 'en_US',
    type: 'website',
    siteName: 'Pyfactor',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
  },
};