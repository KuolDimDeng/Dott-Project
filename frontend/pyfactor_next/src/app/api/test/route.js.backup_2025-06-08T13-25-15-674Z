import { NextResponse } from 'next/server';
import https from 'https';

// Configure global agent for self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Allow self-signed certificates
});

/**
 * API test endpoint - returns status of various backend services
 */
export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    backend: {
      status: 'unknown',
      error: null,
      endpoints: {},
      message: null
    },
    frontend: {
      status: 'ok',
      version: '1.0.0'
    },
    solutions: []
  };
  
  // Test backend connection with various endpoints
  const endpoints = [
    '/api/hr/employees/',
    '/api/database/health-check/'
  ];
  
  try {
    // Test basic connection to backend - try both hostname and IP address
    let response;
    try {
      response = await fetch('https://127.0.0.1:8000/', {
        method: 'GET',
        agent: httpsAgent
      });
    } catch (hostnameError) {
      console.error('Error connecting to backend via hostname:', hostnameError);
      // Try direct IP address as fallback
      response = await fetch('https://127.0.0.1:8000/', {
        method: 'GET',
        agent: httpsAgent
      });
    }
    
    results.backend.status = response.ok ? 'ok' : 'responsive';
    results.backend.statusCode = response.status;
    
    // If the backend is at least responding, consider it a partial success
    if (response.status === 404) {
      results.backend.message = 'Backend server is running and responding with 404 for the root URL, which is expected';
      results.solutions.push({ 
        id: 'use_proxy',
        title: 'Use Next.js Proxy for API Requests',
        description: 'Your backend is running correctly but requires authentication for most endpoints. Use the Next.js proxy at /api/proxy/* to make authenticated requests.'
      });
    }
    
    // Test individual endpoints
    for (const endpoint of endpoints) {
      try {
        const endpointResponse = await fetch(`https://127.0.0.1:8000${endpoint}`, {
          method: 'GET',
          agent: httpsAgent
        });
        
        let responseData;
        try {
          const contentType = endpointResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            responseData = await endpointResponse.json();
          } else {
            responseData = await endpointResponse.text();
          }
        } catch (e) {
          responseData = null;
        }
        
        // For 401 responses, provide a helpful message
        if (endpointResponse.status === 401) {
          results.solutions.push({ 
            id: 'auth_needed',
            title: 'Authentication Required',
            description: `The endpoint ${endpoint} requires authentication. Use the login page to get an auth token.`
          });
        }
        
        // For 500 responses, provide a different message
        if (endpointResponse.status === 500) {
          results.solutions.push({ 
            id: 'server_error',
            title: 'Server Error Detected',
            description: `The endpoint ${endpoint} is returning a 500 error. This might be due to a database connection issue or a problem with the middleware.`
          });
        }
        
        results.backend.endpoints[endpoint] = {
          status: endpointResponse.status,
          ok: endpointResponse.ok,
          contentType: endpointResponse.headers.get('content-type'),
          dataPreview: typeof responseData === 'string' 
            ? responseData.substring(0, 100) 
            : responseData ? JSON.stringify(responseData).substring(0, 100) : null
        };
      } catch (endpointError) {
        results.backend.endpoints[endpoint] = {
          status: 'error',
          error: endpointError.message
        };
      }
    }
    
    // Add helpful solutions based on what we found
    if (Object.keys(results.backend.endpoints).length > 0) {
      const isAnyEndpointOk = Object.values(results.backend.endpoints).some(e => e.ok);
      if (!isAnyEndpointOk) {
        results.solutions.push({ 
          id: 'check_backend_logs',
          title: 'Check Backend Logs',
          description: 'None of the tested endpoints returned a successful response. Check the backend server logs for more information.'
        });
      }
    }
    
    // If we're getting 401 responses, that's actually good - it means the server is working
    if (Object.values(results.backend.endpoints).some(e => e.status === 401)) {
      results.backend.status = 'responsive';
      results.backend.message = 'Backend server is running correctly but requires authentication for some endpoints';
    }
  } catch (error) {
    results.backend.status = 'error';
    results.backend.error = error.message;
    
    // Add connection troubleshooting suggestions
    results.solutions.push({ 
      id: 'server_not_running',
      title: 'Backend Server Not Running',
      description: 'The backend server appears to be offline or not accessible. Make sure it\'s running with: cd backend/pyfactor && python run_https_server_fixed.py'
    });
    
    results.solutions.push({ 
      id: 'check_certificates',
      title: 'Check SSL Certificates',
      description: 'Verify that SSL certificates are properly configured in the certificates directory'
    });
  }
  
  return NextResponse.json(results);
} 