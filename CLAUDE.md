- Frontend scripts location: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
- Backend scripts location: /Users/kuoldeng/projectx/backend/pyfactor/scripts
- Script versioning: Use version control in naming (Version0001_<fix description>_<name of file fixed>)
- File backup: Create backup of important or large files
- Module system: Write scripts using ES modules (not CommonJS)
- Script registry: Maintain script_registry.md in /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/script_registry.md
- Authentication: Use Auth0 (remove cognito/amplify code)
  - Auth0 Domain: dev-cbyy63jovi6zrcos.us.auth0.com
  - Custom Domain: auth.dottapps.com
  - Client ID: 9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
  - Audience: https://api.dottapps.com
  - Custom authentication flow (not standard Auth0 SDK)
  - IMPORTANT: Do NOT use @auth0/nextjs-auth0 SDK - use custom OAuth implementation instead (SDK doesn't work with Next.js standalone mode)
- Next.js version: 15
- Home/Layout pages: 
  - Home: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/page.js
  - Layout: /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/layout.js
- CSS Framework: Tailwind CSS only (no MUI)
- Database: render database "dott-db" with Row-Level Security and tenant isolation
  - PostgreSQL with psycopg2-binary
  - Tenant isolation via tenant_id (not schema-based)
- Language: JavaScript/TypeScript hybrid (Next.js 15 with TypeScript support)
- Package Manager: PNPM (v8.10.0 for frontend, v8.15.3 for root)
- Environment: Production mode only
- Data: No mock data
- Frontend Deployment: Render (Docker), update via git in Dott_Main_Dev_Deploy branch
  - Service name: dott-front
  - Deployment type: Docker (using Dockerfile)
  - Build command in Dockerfile: pnpm run build:render (optimized for faster builds)
  - Optimized build reduces memory from 8GB to 3GB and is 30-50% faster
  - Auto-deploy enabled on git push
  - Custom domains: dottapps.com, www.dottapps.com
  - For clean builds: pnpm run build:production-clean (only if issues)
  - Environment variables must use NEXT_PUBLIC_ prefix for client-side
  - Default next.config.js now includes optimizations and security headers
  - Original config preserved as next.config.original.js
- Backend Deployment: render (dott-api), custom domain api.dottapps.com
  - Service name: dott-api
  - Region: oregon
  - Plan: starter
  - Requirements: requirements-render.txt
- Testing Framework: Jest with jsdom environment
  - Test commands: test, test:watch
  - Setup file: jest.setup.js
- Linting: ESLint (relaxed rules, errors ignored during builds)
  - Command: pnpm run lint
  - TypeScript build errors ignored: ignoreBuildErrors: true
- Integrations:
  - Crisp Chat for customer support (NEXT_PUBLIC_CRISP_WEBSITE_ID)
  - Stripe for payments
  - Google OAuth for authentication
  - CORS configured for specific origins
- Security: 
  - No hardcoded environment keys
  - No sensitive information in code
  - Complex security headers in Next.js config
  - Session encryption with AES-256-CBC
  - Rate limiting on auth (5/15min) and payment (10/hr) endpoints
  - CSRF protection with HMAC-signed tokens
  - Strict CSP without unsafe-inline/unsafe-eval
  - Backend proxy pattern for API calls (no token exposure)
  - 24-hour session duration
  - See SECURITY.md for detailed implementation
- Development Approach:
  - Read existing documentation
  - Make targeted, purposeful changes
  - Ensure clean, efficient code
  - No UI/design changes without permission
- Script Versioning: Tag all scripts (v1.0, v1.1, etc.)
- Change Management:
  - Provide summary before implementation
  - Wait for explicit approval
  - Implement only specified requests
- Important Notes:
  - Remove remaining Cognito/Amplify references from backend code
  - Frontend uses Docker deployment on Render (Dockerfile in root)
  - Webpack optimizations configured for memory management
  - Next.js doesn't support -c flag for custom config files  
  - Rate limiting requires lru-cache dependency (already installed)
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.## Session Management Fixes (2025-01-14)

### Fixed SSL Errors in Internal API Calls
- Removed internal API calls from complete-all endpoint that were causing SSL errors
- Session updates now happen directly via encrypted cookies instead of internal HTTPS calls
- Fixed issue: 'SSL routines:ssl3_get_record:wrong version number'

### Implemented Proper Session Synchronization
- Created dedicated /api/auth/sync-session endpoint for reliable session state management
- Uses AES-256-CBC encryption for all session cookies (replaced base64 encoding)
- Added client-accessible onboarding_status cookie for faster client-side checks
- Updated payment and onboarding forms to use sync-session endpoint
- Session updates now properly propagate between frontend and backend

### Result
- Payment flow now correctly redirects to /tenant/{tenantId}/dashboard after successful payment
- Session state (needsOnboarding, tenantId, subscriptionPlan) properly synchronized
- No more SSL errors or session update failures

### Security Status
- Session encryption: AES-256-CBC ✓
- Rate limiting: Auth (5/15min), Payments (10/hr) ✓
- CSRF protection: HMAC-based tokens ✓
- CSP headers: Removed unsafe-inline ✓
- Secure cookies: httpOnly, secure, sameSite=lax ✓
- Current implementation is production-ready and secure
