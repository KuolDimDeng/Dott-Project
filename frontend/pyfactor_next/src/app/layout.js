// src/app/layout.js
import Providers from '@/src/providers';
import AuthWrapper from './AuthWrapper/page';

export const metadata = {
  title: 'Dott: Small Business Platform',
  description: 'Dott is a small business solutions app that helps small businesses manage their business operations effectively.',
  icons: {
    icon: '/static/images/favicon.png',
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>
          <AuthWrapper>{children}</AuthWrapper>
        </Providers>
      </body>
    </html>
  );
}