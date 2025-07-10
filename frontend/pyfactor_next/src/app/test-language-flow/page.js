'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function TestLanguageFlow() {
  const { i18n } = useTranslation();
  const [flowStatus, setFlowStatus] = useState({});
  
  useEffect(() => {
    checkLanguageFlow();
  }, []);
  
  const checkLanguageFlow = () => {
    const status = {
      // 1. Check current language
      currentLanguage: i18n.language,
      
      // 2. Check localStorage
      localStorage: {
        i18nextLng: localStorage.getItem('i18nextLng'),
        preferredLanguage: localStorage.getItem('preferredLanguage'),
        userManuallySelectedLanguage: localStorage.getItem('userManuallySelectedLanguage')
      },
      
      // 3. Check sessionStorage (OAuth flow)
      sessionStorage: {
        oauth_language: sessionStorage.getItem('oauth_language')
      },
      
      // 4. Check URL parameters
      urlParams: {
        lang: new URLSearchParams(window.location.search).get('lang')
      },
      
      // 5. Check cookies
      cookies: document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && key.includes('lang')) {
          acc[key] = value;
        }
        return acc;
      }, {})
    };
    
    setFlowStatus(status);
  };
  
  const simulateFlow = (language) => {
    // 1. Simulate language selection on landing page
    localStorage.setItem('preferredLanguage', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('userManuallySelectedLanguage', 'true');
    
    // 2. Simulate storing for OAuth
    sessionStorage.setItem('oauth_language', language);
    
    // 3. Change current language
    i18n.changeLanguage(language);
    
    // Refresh status
    checkLanguageFlow();
  };
  
  const clearLanguageData = () => {
    localStorage.removeItem('preferredLanguage');
    localStorage.removeItem('i18nextLng');
    localStorage.removeItem('userManuallySelectedLanguage');
    sessionStorage.removeItem('oauth_language');
    checkLanguageFlow();
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Language Flow Testing</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Language Selection:</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => simulateFlow('sw')} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Simulate Swahili Selection
          </button>
          <button 
            onClick={() => simulateFlow('es')} 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Simulate Spanish Selection
          </button>
          <button 
            onClick={() => simulateFlow('fr')} 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Simulate French Selection
          </button>
          <button 
            onClick={clearLanguageData} 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Language Data
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Current Language Status:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(flowStatus, null, 2)}
          </pre>
        </div>
        
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Language Flow Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>User selects language on landing page → Stored in localStorage</li>
            <li>User clicks "Sign In" → Language added to URL (?lang=sw)</li>
            <li>Sign-in page detects language → Stores in sessionStorage for OAuth</li>
            <li>User signs in with Google → Language preserved in sessionStorage</li>
            <li>OAuth callback retrieves language → Passes to onboarding URL</li>
            <li>Onboarding page detects language → Applies translations</li>
          </ol>
        </div>
        
        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Test OAuth Flow:</h3>
          <p className="text-sm mb-2">To test the complete OAuth flow with language:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click one of the simulate buttons above</li>
            <li>Open: <a href="/auth/signin" className="text-blue-600 underline">/auth/signin</a> - Should show language in URL</li>
            <li>Click "Sign in with Google"</li>
            <li>Complete OAuth flow</li>
            <li>Check if language persists to onboarding</li>
          </ol>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Storage Locations:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>localStorage.preferredLanguage</strong> - Long-term storage</li>
            <li><strong>localStorage.i18nextLng</strong> - i18n library storage</li>
            <li><strong>sessionStorage.oauth_language</strong> - Temporary OAuth flow storage</li>
            <li><strong>URL parameter ?lang=</strong> - Direct language passing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}