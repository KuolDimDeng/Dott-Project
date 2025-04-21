# HTTPS, RLS and Image Loading Fixes

This document explains the fixes applied to resolve issues with HTTPS configuration, Row Level Security (RLS), and image loading in the development environment.

## 1. HTTPS Configuration Fixes

The application was experiencing a "Secure Connection Failed" error (SSL_ERROR_RX_RECORD_TOO_LONG) when accessing https://localhost:3000. This error occurred because the server was configured to serve plain HTTP content over an HTTPS connection.

### Applied Fixes:

1. **Fixed HTTPS Server Configuration**:
   - Ensured proper SSL certificate usage in the server setup
   - Updated the Next.js configuration to properly handle HTTPS connections
   - Created a `start-https.sh` script to correctly initialize the HTTPS environment

2. **Improved Certificate Handling**:
   - Validated certificate paths in server startup
   - Added error handling for missing or invalid certificates

## 2. Row Level Security (RLS) Fixes

The backend was showing errors related to RLS configuration, specifically:
```
ERROR: unrecognized configuration parameter "app.current_tenant"
```

### Applied Fixes:

1. **Added RLS Parameter Initialization**:
   - Created `init_rls_param.py` script to initialize the PostgreSQL `app.current_tenant` parameter
   - Implemented session-level fallback when database-level parameter setting isn't possible

2. **Improved Server Startup**:
   - Created `run_https_server_fixed.py` that initializes RLS before starting Django
   - Added proper error handling and graceful shutdown

3. **RLS Context Management**:
   - Updated RLS utility functions to handle empty strings instead of NULL
   - Enhanced tenant context verification to work with the modified parameters

## 3. Image Loading Fixes

The frontend was experiencing image loading errors, shown in the console as:
```
upstream image response failed for /static/images/Work-Life-Balance-1--Streamline-Brooklyn.png TypeError: fetch failed
```

### Applied Fixes:

1. **Next.js Configuration Update**:
   - Modified `next.config.js` to disable image optimization in development mode
   - Added proper configuration for image domains and security policies

2. **UnoptimizedImage Component**:
   - Created a wrapper component `UnoptimizedImage.js` that sets `unoptimized=true` by default
   - This component can be used as a drop-in replacement for Next.js Image component

## How to Apply These Fixes

### Backend RLS Fixes:

1. Run the RLS parameter initialization script:
   ```bash
   cd backend/pyfactor
   python init_rls_param.py
   ```

2. Use the fixed HTTPS server script:
   ```bash
   cd backend/pyfactor
   python run_https_server_fixed.py
   ```

### Frontend Image Fixes:

1. Start the frontend with the HTTPS script:
   ```bash
   cd frontend/pyfactor_next
   ./start-https.sh
   ```

2. For image components, use the UnoptimizedImage component:
   ```jsx
   import UnoptimizedImage from '@/components/UnoptimizedImage';
   
   // Then use it as a drop-in replacement for Image
   <UnoptimizedImage
     src="/path/to/image.png"
     alt="Description"
     width={500}
     height={300}
   />
   ```

## Testing

After applying these fixes:

1. Access the application at https://localhost:3000
2. Verify that images load correctly
3. Check backend logs to confirm no RLS errors are present
4. Verify that API requests work correctly through the proxied endpoints

If issues persist, check the server logs for specific error messages and refer to the appropriate fix section in this document. 