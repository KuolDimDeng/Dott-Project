import { NextResponse } from 'next/server';

/**
 * Cross-Origin Verification Endpoint
 * Required by Auth0 for cross-origin authentication
 */
export async function GET() {
  // Return a simple HTML page that Auth0 can use for verification
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cross-Origin Verification</title>
      <script>
        // Auth0 cross-origin verification script
        function receiveMessage(event) {
          if (event.data.type === 'authorization_ping') {
            event.source.postMessage({
              type: 'authorization_pong'
            }, event.origin);
          }
        }
        window.addEventListener('message', receiveMessage, false);
      </script>
    </head>
    <body>
      <p>Verifying...</p>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}