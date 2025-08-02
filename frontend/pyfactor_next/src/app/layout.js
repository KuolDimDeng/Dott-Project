import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import SessionHeartbeat from '@/components/SessionHeartbeat';
import ChunkErrorHandler from '@/components/ChunkErrorHandler';
import TDZProtectionInitializer from '@/components/TDZProtectionInitializer';
import Providers from '@/providers';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Dott: Global Business Platform",
  description: "AI-powered global business platform for accounting, inventory, HR, and transport management",
  keywords: "AI business software, artificial intelligence, accounting, inventory management, HR software, transport management, business software",
  authors: [{ name: "Dott Apps" }],
  manifest: "/static/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dott: Global Business Platform",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
};

export default function RootLayout({ children }) {
  // Don't use headers for client-side logic to prevent hydration mismatch
  // Admin routes will handle their own logic

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Security headers for device fingerprinting */}
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        
        {/* Google Fonts for handwriting effect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
        
        {/* Plaid CDN preconnect for faster loading */}
        <link rel="preconnect" href="https://cdn.plaid.com" />
        <link rel="dns-prefetch" href="https://cdn.plaid.com" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/static/images/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-1668x2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/static/images/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className={inter.className}>
        {/* Session Heartbeat Component */}
        <SessionHeartbeat interval={60000} />
        
        {/* Chunk Error Handler */}
        <ChunkErrorHandler />
        
        {/* TDZ Protection Initializer */}
        <TDZProtectionInitializer />
        
        <Providers>
          {children}
        </Providers>
        
        {/* Plaid script is now loaded dynamically by PlaidScriptWrapper component */}
        
        {/* Crisp Chat Widget */}
        {process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID && (
          <Script
            id="crisp-chat"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.$crisp=[];
                window.CRISP_WEBSITE_ID="${process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID}";
                (function(){
                  d=document;
                  s=d.createElement("script");
                  s.src="https://client.crisp.chat/l.js";
                  s.async=1;
                  d.getElementsByTagName("head")[0].appendChild(s);
                })();
              `,
            }}
          />
        )}
        
        {/* Device Fingerprinting Script - Disabled temporarily due to import issues */}
        {/* Will be initialized within components that need it */}
      </body>
    </html>
  );
}