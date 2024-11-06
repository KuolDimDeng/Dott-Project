///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
import Providers from '@/providers';
import { OnboardingProvider } from '@/app/onboarding/contexts/onboardingContext';


export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  title: 'Dott: Small Business Platform',
  description: 'Dott is a small business solutions app that helps small businesses manage their business operations effectively.',
  icons: {
    icon: '/static/images/favicon.png',
    apple: '/static/images/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          type="image/png"
          href="/static/images/favicon.png"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <OnboardingProvider>
            {children}
          </OnboardingProvider>
        </Providers>
      </body>
    </html>
  );
}