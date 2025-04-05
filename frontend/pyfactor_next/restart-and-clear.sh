#!/bin/bash

# Script to clear cache and restart the Next.js server

echo "📋 Pyfactor Next.js Server Restart Script"
echo "----------------------------------------"

# Stop any running processes
echo "🛑 Stopping any running Next.js processes..."
pkill -f "node.*next"

# Clear caches
echo "🧹 Clearing caches..."

# Clear Next.js cache
rm -rf .next
rm -rf .turbo
rm -rf node_modules/.cache
echo "✅ Next.js cache cleared"

# Clear browser-related local caches 
if [ -f "public/reset-cache.js" ]; then
  echo "ℹ️ Browser cache reset script exists, will be triggered on next load"
fi

# Clear localStorage in development
cat > public/reset-loop.html <<EOL
<!DOCTYPE html>
<html>
<head>
  <title>Clearing Cache</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .container {
      text-align: center;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 500px;
    }
    h1 { color: #2563eb; margin-bottom: 1rem; }
    p { color: #4b5563; line-height: 1.5; margin-bottom: 1.5rem; }
    .progress {
      width: 100%;
      height: 8px;
      background-color: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .progress-bar {
      height: 100%;
      background-color: #2563eb;
      width: 0%;
      transition: width 0.3s ease;
    }
    .log {
      background-color: #f3f4f6;
      border-radius: 4px;
      padding: 0.75rem;
      width: 100%;
      height: 100px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .message { margin-bottom: 0.25rem; }
    .success { color: #047857; }
    .error { color: #dc2626; }
    .warning { color: #d97706; }
    .info { color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Clearing Cache & Resetting Application State</h1>
    <p>This process will clear browser storage, application cache, and reset the application state.</p>
    
    <div class="progress">
      <div id="progressBar" class="progress-bar"></div>
    </div>
    
    <div id="log" class="log"></div>
    
    <p id="status">Initializing reset process...</p>
  </div>

  <script>
    const log = document.getElementById('log');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('status');
    
    function addLogMessage(message, type = 'info') {
      const msgElement = document.createElement('div');
      msgElement.className = \`message \${type}\`;
      msgElement.textContent = message;
      log.appendChild(msgElement);
      log.scrollTop = log.scrollHeight;
    }
    
    function updateProgress(percent) {
      progressBar.style.width = \`\${percent}%\`;
    }
    
    async function resetApplication() {
      try {
        // Initialize
        updateProgress(5);
        addLogMessage('Starting application reset...', 'info');
        
        // Clear localStorage
        updateProgress(20);
        addLogMessage('Clearing localStorage...', 'info');
        localStorage.clear();
        addLogMessage('localStorage cleared successfully', 'success');
        
        // Clear sessionStorage
        updateProgress(40);
        addLogMessage('Clearing sessionStorage...', 'info');
        sessionStorage.clear();
        addLogMessage('sessionStorage cleared successfully', 'success');
        
        // Clear cookies
        updateProgress(60);
        addLogMessage('Clearing cookies...', 'info');
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name && name !== 'NEXT_LOCALE') { // Preserve locale setting
            document.cookie = \`\${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;\`;
          }
        });
        addLogMessage('Cookies cleared successfully', 'success');
        
        // Clear service workers
        updateProgress(80);
        addLogMessage('Unregistering service workers...', 'info');
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
          addLogMessage('Service workers unregistered successfully', 'success');
        } else {
          addLogMessage('No service workers to unregister', 'info');
        }
        
        // Final steps
        updateProgress(100);
        addLogMessage('Reset complete!', 'success');
        statusText.textContent = 'Reset complete! Redirecting to application...';
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } catch (error) {
        addLogMessage(\`Error during reset: \${error.message}\`, 'error');
        statusText.textContent = 'Error occurred during reset. You may need to refresh manually.';
      }
    }
    
    // Start the reset process
    setTimeout(resetApplication, 500);
  </script>
</body>
</html>
EOL

echo "✅ Reset page created"

# Install or update dependencies
echo "📦 Updating dependencies..."
pnpm install
echo "✅ Dependencies updated"

# Start dev server
echo "🚀 Starting Next.js development server..."
NEXT_PUBLIC_ENV=development NODE_OPTIONS='--max-old-space-size=4096' pnpm dev