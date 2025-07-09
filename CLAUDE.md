# CLAUDE.md - Dott Project Configuration
*Last Updated: 2025-07-09*

## Numbering System Guide
- **Format**: `[MAJOR.MINOR.PATCH] - DATE - STATUS`
- **MAJOR**: Breaking changes or complete overhauls
- **MINOR**: New features or significant improvements  
- **PATCH**: Bug fixes or small updates
- **STATUS**: CURRENT (active), DEPRECATED (replaced), HISTORICAL (reference only)

---

## CURRENT CONFIGURATIONS (Active Instructions)

### [1.0.0] - 2025-06-24 - CURRENT - Core Project Configuration
- **Frontend scripts**: /Users/kuoldeng/projectx/frontend/pyfactor_next/scripts
- **Backend scripts**: /Users/kuoldeng/projectx/backend/pyfactor/scripts
- **Package Manager**: PNPM v8.15.3 (unified version)
- **Environment**: Production mode only (no mock data)
- **Module system**: ES modules only (not CommonJS)

### [1.1.0] - 2025-06-24 - CURRENT - Technology Stack
- **Frontend**: Next.js 15 with TypeScript support
- **CSS**: Tailwind CSS only (no MUI)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Testing**: Jest with jsdom environment
- **Linting**: ESLint (relaxed rules, ignoreBuildErrors: true)

### [1.2.0] - 2025-06-24 - CURRENT - Authentication & Deployment
- **Auth Provider**: Auth0 (custom OAuth implementation)
- **Auth0 Domain**: dev-cbyy63jovi6zrcos.us.auth0.com
- **Client ID**: 9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF
- **IMPORTANT**: Do NOT use @auth0/nextjs-auth0 SDK
- **Frontend Service**: dott-front (Render Docker, branch: Dott_Main_Dev_Deploy)
- **Backend Service**: dott-api (api.dottapps.com, oregon region)
- **Domains**: dottapps.com, www.dottapps.com

### [2.0.0] - 2025-06-18 - CURRENT - Session Management V2
- **Architecture**: Server-side sessions only (banking standard)
- **Storage**: Single 'sid' cookie (36 bytes) vs old 15+ cookies (3.8KB)
- **API**: /api/auth/session-v2 (GET/POST/DELETE)
- **Default**: PostgreSQL session storage
- **Redis**: OPTIONAL - Add REDIS_URL env var to enable

### [3.0.0] - 2025-06-21 - CURRENT - Backend Single Source of Truth
- **Core Rule**: Backend's `user.onboarding_completed` is ONLY source of truth
- **Implementation**: All plans call `/api/onboarding/complete-all`
- **Forbidden**: Local storage/cookies for onboarding status, frontend tenant handling

### [4.0.0] - 2025-06-23 - CURRENT - Industry-Standard API Pattern
- **Pattern**: Frontend → Local Proxy → Django → PostgreSQL with RLS
- **Security**: Database-enforced isolation, session-based auth, compliance ready
- **Tenant Isolation**: Backend-only tenant determination, returns 404 for cross-tenant

### [5.0.0] - 2025-06-24 - CURRENT - UI Design Standards
- **Components**: Summary Cards, Search Toolbar, Tab Navigation, Standardized Tables
- **Color Palette**: Blue primary, Green success, Yellow warning, Red error
- **Icons**: Phosphor Icons for dashboards, Heroicons for pages
- **Tooltips**: Required on ALL input fields using FieldTooltip component

### [6.0.0] - 2025-01-25 - CURRENT - Security & Development
- **RBAC**: OWNER/ADMIN/USER roles with granular permissions
- **Session**: AES-256-CBC encryption, 24-hour duration
- **Rate Limiting**: Auth (5/15min), Payments (10/hr)
- **CSP**: Strict without unsafe-inline/unsafe-eval
- **Code Style**: NO COMMENTS unless asked, prefer editing existing files

### [7.0.0] - 2025-06-26 - CURRENT - Integration Services
- **Crisp Chat**: Customer support
- **Stripe**: Payment processing with Connect for invoice payments (2.5% + $0.30 fee)
- **Google OAuth**: Additional authentication
- **Cloudflare**: Security, caching, global performance

### [10.0.0] - 2025-06-26 - CURRENT - Troubleshooting Resources
- **Frontend**: `/frontend/pyfactor_next/docs/TROUBLESHOOTING.md`
- **Backend**: `/backend/pyfactor/docs/TROUBLESHOOTING.md`
- **Common Issue**: Module GET returns empty - move to EXEMPT_PATHS

### [13.0.0] - 2025-07-03 - CURRENT - Claude API Integration
- **Model**: `claude-sonnet-4-20250514` (all APIs upgraded)
- **Tax API**: CLAUDE_API_KEY for tax calculations
- **Smart Insights**: CLAUDE_SMART_INSIGHTS_API_KEY for business intelligence
- **Credit System**: 1 credit = $0.001 API usage, user pays $0.10
- **Rate Limiting**: 10 requests/minute via Redis

### [14.0.0] - 2025-01-28 - CURRENT - Component Standards
- **Spinner**: StandardSpinner with size variants
- **Country Mapping**: `/src/utils/countryMapping.js` for global support
- **Session Hook**: Always use `useSession` for user data display

### [17.0.0] - 2025-07-01 - CURRENT - Dashboard State Management
- **Solution**: Use functional state updates for ALL setters
- **Key Learning**: Never include state values in callback dependencies
- **Pattern**: `updateState(prev => ({ ...prev, newValue }))`

### [18.0.0] - 2025-07-02 - CURRENT - MFA Implementation
- **Features**: TOTP, Email, Recovery Codes via Auth0 Management API
- **Components**: Security tab, MFA setup page, management API
- **Environment**: AUTH0_M2M_CLIENT_ID/SECRET required

### [19.0.0] - 2025-07-01 - CURRENT - Local Testing Workflow
- **Mandatory**: ALL backend changes tested locally first
- **Workflow**: Start services → Syntax check → Build → Django check → Deploy
- **Tools**: Docker Desktop, docker-compose required

### [21.0.0] - 2025-07-04 - CURRENT - AI-Powered Import/Export
- **Access**: OWNER/ADMIN only
- **AI Features**: Field mapping with confidence scores, usage limits by plan
- **Formats**: Excel, CSV, PDF, QuickBooks (future)
- **Security**: Tenant isolation, session-based

### [22.0.0] - 2025-07-04 - CURRENT - Notification System
- **User**: Bell icon, unread count, 90-day retention
- **Admin**: JWT auth, targeted notifications, audit logging
- **Cleanup**: Daily command for old notifications

### [23.0.0] - 2025-07-05 - CURRENT - Monitoring & Performance
- **Sentry**: Error tracking, performance monitoring, session replay
- **Cloudflare**: CDN, security, caching with page rules
- **Session Handling**: Cloudflare-compatible with SameSite=None

### [26.0.0] - 2025-07-06 - CURRENT - Grace Period System
- **Grace Period**: 7 days first failure, 3 days repeated
- **Status Flow**: active → grace_period → suspended → active
- **Automation**: Stripe webhooks, daily cron processing

### [27.0.0] - 2025-07-08 - CURRENT - Payroll Wizard
- **Architecture**: 7-step wizard with AI assistance
- **Features**: Multi-country support, pay stub viewer, real-time processing
- **Revenue**: 2.4% platform fee + transfer fees
- **Integration**: Complete API structure, menu integration

### [28.0.0] - 2025-07-08 - CURRENT - Debug Logging Standard
- **Mandatory**: All debugging requires comprehensive logging
- **Pattern**: Unique prefixes, input/output logging, error context
- **Example**: `console.log('🎯 [Component] === START ===');`

### [29.0.0] - 2025-07-09 - CURRENT - Tax Filing Service Pricing Update
- **Purpose**: Competitive pricing for tax filing services with developing country discounts
- **Sales Tax Pricing**:
  - Full Service: $75/filing (quarterly), $300/year, $200 multi-state
  - Self Service: $35/filing (quarterly), $140/year, $100 multi-state
- **Payroll Tax Pricing**:
  - Full Service: $125 (Form 941), $150 (Form 940), $450 complete package
  - Self Service: $65 (Form 941), $85 (Form 940), $250 complete package
- **Income Tax Pricing**:
  - Full Service: $250 sole prop, $395 LLC/S-Corp, $595 C-Corp (+$75/state)
  - Self Service: $125 sole prop, $195 LLC/S-Corp, $295 C-Corp (+$50/state)
- **W-2/1099 Generation**: $2/form full service, $1/form self service (min $25/$15)
- **Developing Country Discount**: 50% off all prices (same as subscription)
- **Payment Methods**: Stripe (worldwide), M-Pesa (Kenya automatic detection)
- **Implementation**:
  - Frontend: Dynamic pricing with async calculation and visual discount display
  - Backend: Updated payment integration with regional pricing support
  - API: Automatic country detection and payment method selection

---

## DEPRECATED CONFIGURATIONS (Do Not Use)

### [1.4.0-1.9.0] - Session Management Early Versions
- **Deprecated by**: [2.0.0]
- **Issues**: Redis complexity, multiple sources of truth, SSL errors

### [12.0.0] - Django Migration Workflow
- **Deprecated by**: [19.0.0]
- **Issue**: No pre-deployment testing

---

## HISTORICAL NOTES

### Evolution Summary
- **Authentication**: Cognito → Auth0 SDK → Custom OAuth
- **Sessions**: 15+ cookies → Redis caching → Server-side only
- **Onboarding**: Multiple fixes → Backend single source of truth
- **Security**: Basic → Fingerprinting → Bank-grade implementation

### Current Pricing
- **Basic** (Free): 1 user, 3GB storage
- **Professional**: $15/mo or $144/year
- **Enterprise**: $45/mo or $432/year

---

## IMPORTANT REMINDERS
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create documentation
- ALWAYS use handleAuthError() for auth errors
- ALWAYS use useSession hook for user data display
- TEST edge cases thoroughly

---

## Quick Reference

### Fix Onboarding Issues
```bash
python manage.py shell < scripts/fix_all_incomplete_onboarding.py
```

### Local Testing Commands
```bash
docker-compose up db redis --detach
python3 -m py_compile *.py
docker-compose build backend
docker-compose exec backend python manage.py check
```

### Environment Variables (Key)
```
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_SMART_INSIGHTS_API_KEY=sk-ant-api03-...
REDIS_URL=redis://...
AUTH0_M2M_CLIENT_ID=...
STRIPE_SECRET_KEY=sk_...
```