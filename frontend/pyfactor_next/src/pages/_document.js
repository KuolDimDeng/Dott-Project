import { Html, Head, Main, NextScript } from 'next/document';

// This custom Document class allows us to add custom elements to all pages
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Add polyfill script inline to ensure it loads before any modules */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // Fix for "exports is not defined" error
            if (typeof exports === 'undefined') {
              window.exports = {};
            }
            if (typeof module === 'undefined') {
              window.module = { exports: {} };
            }
            if (typeof process === 'undefined') {
              window.process = { env: { NODE_ENV: '${process.env.NODE_ENV || 'production'}' } };
            }
            if (typeof require === 'undefined') {
              window.require = function(mod) { 
                console.warn('require() is not available, requested:', mod);
                return {}; 
              };
              window.require.resolve = function() { return ''; };
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 