'use client';

// Global error boundary to catch appCache errors
export default function GlobalError({ error, reset }) {
  console.error('[GlobalError] Application error:', error);
  
  // Check if this is the appCache error
  if (error?.message?.includes('appCache is not defined')) {
    // Clear any cached data and reload
    if (typeof window !== 'undefined') {
      console.log('[GlobalError] Clearing cache and reloading due to appCache error');
      
      // Clear localStorage
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Clear sessionStorage
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('Failed to clear sessionStorage:', e);
      }
      
      // Hard reload the page
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
      
      return (
        <html>
          <body>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '100vh',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              <h2>Loading Dashboard...</h2>
              <p>Please wait while we update your application.</p>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginTop: '20px'
              }} />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          </body>
        </html>
      );
    }
  }
  
  // For other errors, show error UI
  return (
    <html>
      <body>
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <h2>Something went wrong!</h2>
          <p>{error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}