'use client';

import { useState, useEffect } from 'react';

export default function TestCookiesPage() {
  const [cookies, setCookies] = useState({});
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Read current cookies
    const currentCookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    setCookies(currentCookies);
  }, []);

  const runTests = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: AJAX cookie setting
      console.log('🧪 Test 1: Testing AJAX cookie setting...');
      const ajaxResponse = await fetch('/api/auth/test-cookie-setting');
      const ajaxData = await ajaxResponse.json();
      
      results.push({
        name: 'AJAX Cookie Test',
        success: ajaxResponse.ok,
        data: ajaxData,
        headers: Object.fromEntries(ajaxResponse.headers.entries())
      });

      // Wait a moment for cookies to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Check debug endpoint
      console.log('🧪 Test 2: Checking cookie status...');
      const debugResponse = await fetch('/api/auth/debug-cookies');
      const debugData = await debugResponse.json();
      
      results.push({
        name: 'Cookie Debug Check',
        success: debugResponse.ok,
        data: debugData
      });

      // Test 3: Form-based cookie setting
      console.log('🧪 Test 3: Testing form-based cookie setting...');
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/auth/test-cookie-setting';
      form.target = '_blank'; // Open in new tab to see result

      const redirectInput = document.createElement('input');
      redirectInput.type = 'hidden';
      redirectInput.name = 'redirectUrl';
      redirectInput.value = '/api/auth/debug-cookies';
      form.appendChild(redirectInput);

      document.body.appendChild(form);
      
      results.push({
        name: 'Form Cookie Test',
        success: true,
        data: { message: 'Form submitted - check new tab for results' }
      });

      // Don't submit form automatically, let user click button
      // form.submit();
      document.body.removeChild(form);

      // Test 4: JavaScript cookie setting
      console.log('🧪 Test 4: Testing JavaScript cookie setting...');
      document.cookie = `js_test_cookie=test_${Date.now()}; path=/; max-age=3600; samesite=lax`;
      
      results.push({
        name: 'JavaScript Cookie Test',
        success: true,
        data: { 
          message: 'Cookie set via JavaScript',
          cookie: document.cookie
        }
      });

      // Refresh cookie display
      const updatedCookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name) acc[name] = value;
        return acc;
      }, {});
      setCookies(updatedCookies);

    } catch (error) {
      results.push({
        name: 'Error',
        success: false,
        data: { error: error.message }
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  const testFormSubmit = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/test-cookie-setting';
    
    const redirectInput = document.createElement('input');
    redirectInput.type = 'hidden';
    redirectInput.name = 'redirectUrl';
    redirectInput.value = '/api/auth/debug-cookies';
    form.appendChild(redirectInput);

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Cookie Testing Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Cookies</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(cookies, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookie Tests</h2>
          <div className="space-y-4">
            <button
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Running Tests...' : 'Run Cookie Tests'}
            </button>
            
            <button
              onClick={testFormSubmit}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 ml-4"
            >
              Test Form Submit (New Tab)
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <h3 className={`text-lg font-semibold mb-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.name} - {result.success ? 'Success' : 'Failed'}
                </h3>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
                {result.headers && (
                  <div className="mt-4">
                    <h4 className="font-semibold">Response Headers:</h4>
                    <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm mt-2">
                      {JSON.stringify(result.headers, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Debugging Information</h3>
          <ul className="list-disc list-inside text-yellow-700 space-y-1">
            <li>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</li>
            <li>Protocol: {typeof window !== 'undefined' ? window.location.protocol : 'N/A'}</li>
            <li>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</li>
            <li>Secure Context: {typeof window !== 'undefined' ? window.isSecureContext ? 'Yes' : 'No' : 'N/A'}</li>
            <li>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}