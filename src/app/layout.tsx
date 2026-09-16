import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feeder.life | Social Platform for Animals, Feeders & Rescue Action',
  description:
    'The modern social animal-welfare network connecting street animal feeders, rescuers, volunteers, and communities. Log feedings, respond to emergency SOS, and protect community animals.',
  openGraph: {
    title: 'Feeder.life | Social Platform for Animals, Feeders & Rescue Action',
    description:
      'The modern social animal-welfare network connecting street animal feeders, rescuers, volunteers, and communities.',
    url: 'https://feeder.life',
    siteName: 'Feeder.life',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feeder.life | Social Animal Welfare Network',
    description: 'Empowering community feeders and rescue volunteers.',
  },
  icons: {
    icon: [
      { url: '/images/feeder-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/images/feeder-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

import FirebaseAnalytics from '@/components/common/FirebaseAnalytics';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
