// Static not-found page - no React context
export default function NotFound() {
  return (
    <html>
      <head>
        <title>404 - Page Not Found</title>
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>404</h1>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Page Not Found</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Sorry, we couldn't find the page you're looking for.
          </p>
          <a
            href="/"
            style={{ 
              display: 'inline-block',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              transition: 'background-color 0.2s'
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  );
} 