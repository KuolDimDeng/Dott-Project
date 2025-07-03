import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import SessionHeartbeat from '@/components/SessionHeartbeat';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Dott: Complete Business Software",
  description: "All-in-one platform for accounting, inventory, HR, and transport management",
  keywords: "accounting, inventory management, HR software, transport management, business software",
  authors: [{ name: "Dott Apps" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Security headers for device fingerprinting */}
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
      </head>
      <body className={inter.className}>
        {/* Session Heartbeat Component */}
        <SessionHeartbeat interval={60000} />
        
        {children}
        
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