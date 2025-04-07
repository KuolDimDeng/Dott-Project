// Import our polyfill first to ensure compatibility
import '../utils/modulePolyfill';

// Import Amplify configuration early
import '../lib/amplifyConfig';

import React from 'react';
import Head from 'next/head';

// This script will be inserted inline to fix "exports is not defined" error
const ModuleFixScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        // Fix for "exports is not defined" error
        if (typeof window !== 'undefined') {
          if (typeof window.exports === 'undefined') window.exports = {};
          if (typeof window.module === 'undefined') window.module = { exports: window.exports };
          if (typeof window.process === 'undefined') window.process = { env: { NODE_ENV: '${process.env.NODE_ENV || 'production'}' } };
          if (typeof window.Buffer === 'undefined') window.Buffer = function() {};
          if (typeof window.require === 'undefined') window.require = function(mod) { 
            console.warn('require() not available:', mod);
            return {}; 
          };
        }
      `,
    }}
  />
);

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Add the script to the head to ensure it loads before any module code */}
        <ModuleFixScript />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 