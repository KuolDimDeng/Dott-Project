- Frontend scripts location: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
- Backend scripts location: /Users/kuoldeng/projectx/backend/pyfactor/scripts
- Script versioning: Use version control in naming (Version0001_<fix description>_<name of file fixed>)
- File backup: Create backup of important or large files
- Module system: Write scripts using ES modules (not CommonJS)
- Script registry: Maintain script_registry.md in /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts/script_registry.md
- Authentication: Use Auth0 (no Cognito/Amplify)
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
- Database: Render database "dott-db" with Row-Level Security and tenant isolation
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
- Backend Deployment: Render (dott-api), custom domain api.dottapps.com
  - Service name: dott-api
  - Region: oregon
  - Plan: starter
  - Requirements: requirements-render.txt
  - Redis: REQUIRED - Add Redis instance on Render and set REDIS_URL environment variable
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
  - Session fingerprinting for hijacking prevention
  - Security event logging and anomaly detection
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
  - Frontend uses Docker deployment on Render (Dockerfile in root)
  - Webpack optimizations configured for memory management
  - Next.js doesn't support -c flag for custom config files  
  - Rate limiting requires lru-cache dependency (already installed)

## Session Management V2 (Current Implementation)
- Server-side sessions with Redis caching (REQUIRED)
- Multi-tier caching: Local → Redis → PostgreSQL
- Session cookies: 'sid' and 'session_token' (both set for compatibility)
- Cookie size: 36 bytes (session ID only) vs old system with 15+ cookies
- Backend is single source of truth for session data
- API endpoints: /api/auth/session-v2 (GET/POST/DELETE)
- Frontend: useSession from '@/hooks/useSession-v2'
- Auth flow: Auth0 → backend session creation → session ID cookie
- Session updates handled server-side, frontend clears cache for fresh data
- Redis configuration:
  - REQUIRED: Set REDIS_URL environment variable in production
  - Cache TTL: 30 minutes default (SESSION_CACHE_TTL)
  - Performance: ~1ms (Redis) vs ~5ms (PostgreSQL only)
  - Circuit breaker pattern for Redis failures (falls back to PostgreSQL)
- Key component: sessionManager-v2-enhanced.js with Redis integration

## Auth Error Handling
- Use handleAuthError() utility for auth-related errors
- Never show raw error messages to users
- Always provide actionable recovery options
- Check for cookies enabled before auth operations
- Validate sessions proactively
- Handle rate limiting gracefully with wait times
- Test edge cases: network errors, session expiry, concurrent logins

## Subscription Pricing (Current)
- **Basic** (Free): 1 user, 3GB storage, basic support, all core features
- **Professional**: $15/mo or $144/year (20% discount), 3 users, unlimited storage, priority support
- **Enterprise**: $45/mo or $432/year (20% discount), unlimited users, custom onboarding, dedicated support
- All tiers include: income/expense tracking, invoicing, payments (Stripe/PayPal/Mobile Money), inventory management
- Regional pricing: 50% discount for developing countries (automatically detected)

## Recent Fixes
- **Google OAuth Redirect Fix**: Fixed tenant_id extraction from nested tenant object in backend response
- **Session Creation 403 Error**: Fixed by adding `/api/sessions/` to RLS middleware public paths
- **Onboarding Status**: Backend properly updates status after payment completion
- **URL Standardization**: All routes use `/{tenantId}/dashboard` pattern (no legacy `/tenant/` prefix)

## Onboarding Flow
- Single source of truth: Backend database
- Progress saved after each step
- Handles browser refresh and cache clearing
- State machine ensures valid transitions
- Error recovery with clear user messages
- Components use .v2 versions for enhanced reliability

## Security Features
- Session fingerprinting prevents hijacking
- Security event logging for audit trails
- Anomaly detection for suspicious patterns
- Enhanced security headers (HSTS, CSP, etc.)
- POST-based session handoff (no tokens in URLs)
- Automatic session invalidation for security threats

# Important Instruction Reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.