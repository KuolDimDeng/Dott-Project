# CLAUDE.md - Dott Project Configuration
*Last Updated: 2025-07-30*

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
- **Frontend Service**: dott-front (Render Docker, branch: main)
- **Backend Service**: dott-api (api.dottapps.com, oregon region)
- **Domains**: dottapps.com, www.dottapps.com, app.dottapps.com
- **Branch Structure**: main (production), staging (testing)

### [1.3.0] - 2025-08-15 - CURRENT - Git Workflow & Deployment Process
- **CRITICAL**: ALL code changes MUST be committed to `staging` branch FIRST
- **Workflow**: Local → staging → (test) → main (production)
- **NEVER**: Commit directly to main/production branch
- **Staging Environment**: ACTIVE - All changes must be tested on staging first
- **Commands**: 
  - Development: `git push origin staging`
  - Production: `git push origin staging:main` (only after staging verification)
- **Staging URL**: staging.dottapps.com
- **Production URL**: dottapps.com, app.dottapps.com

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
- **Stripe**: Payment processing with Connect for invoice payments
- **Google OAuth**: Additional authentication
- **Cloudflare**: Security, caching, global performance
- **Note**: See [34.0.0] for updated Stripe platform fee structure

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

### [29.0.0] - 2025-07-09 - CURRENT - Tax Filing Service Pricing
- **Sales Tax**: Full $75/filing, Self $35/filing
- **Payroll Tax**: Full $125-$450, Self $65-$250
- **Income Tax**: Full $250-$595, Self $125-$295
- **W-2/1099**: $2/form full service, $1/form self service
- **Developing Country Discount**: 50% off all prices
- **Payment Methods**: Stripe (worldwide), M-Pesa (Kenya)

### [30.0.0] - 2025-07-09 - CURRENT - Subscription Regional Pricing
- **Plans**: Basic (Free), Professional ($15/mo), Enterprise ($45/mo)
- **Developing Countries**: 50% discount (128 countries)
- **Billing Cycles**: Monthly, 6-month (17% off), Yearly (20% off)
- **Payment Methods**: Credit Card, M-Pesa (Kenya), Flutterwave (Nigeria), MTN Mobile Money
- **Key Files**: `/src/app/onboarding/payment/page.js`, `/docs/SUBSCRIPTION_PRICING.md`

### [31.0.0] - 2025-07-12 - CURRENT - Interactive User Cleanup Tool
- **Features**: Delete user by email, delete all users, list users
- **Location**: `/backend/pyfactor/scripts/interactive_user_cleanup.py`
- **Safety**: Confirmation prompts, transaction rollback, 64+ table handling
- **Documentation**: `/backend/pyfactor/docs/INTERACTIVE_USER_CLEANUP.md`

### [32.0.0] - 2025-07-12 - CURRENT - Employee API V2 Implementation
- **Solution**: Clean V2 API with consistent response format
- **Key Changes**: Fixed serialization, async/await, phone formatting
- **Response Format**: `{success: true, data: {...}, message: "..."}`
- **Migration**: All frontend calls updated to v2 endpoints

### [33.0.0] - 2025-07-13 - CURRENT - User Cleanup Scripts & Transaction Atomic
- **Scripts**: `comprehensive_user_cleanup.py` - handles all foreign keys
- **Prevention**: @transaction.atomic on user creation
- **Tables**: 64+ dependencies auto-discovered
- **Documentation**: `/backend/pyfactor/docs/TROUBLESHOOTING.md`

### [34.0.0] - 2025-07-14 - CURRENT - Stripe Connect SSN Storage
- **Express Account**: acct_1RkYGFC77wwa4lUB (Dott LLC)
- **Implementation**: SSNs stored in Stripe, only last 4 kept locally
- **Migration**: `/backend/pyfactor/scripts/migrate_existing_ssns_to_stripe.py`
- **Documentation**: `/STRIPE_SSN_MIGRATION_GUIDE.md`

### [35.0.0] - 2025-07-14 - CURRENT - Platform Fee Structure
- **Card Payments (Invoice/Vendor)**: 
  - Stripe charges: 2.9% + $0.30
  - Platform fee: 0.1% + $0.30
  - Total to customer: 3.0% + $0.60
- **Mobile Money Payments**: 2% platform fee
- **Bank Transfers**: 0.1% + $0.30 platform fee
- **Payroll**: 2.4% platform fee (configurable)
- **Subscriptions**: 2.5% (configurable)
- **Revenue Example**: 1,000 card transactions/month = $300 profit

### [36.0.0] - 2025-07-14 - CURRENT - WhatsApp Business API Integration
- **Phone Number ID**: 676188225586230
- **Test Number**: +1 555 190 5954
- **Features**: Invitations, future invoice notifications
- **Environment**: WHATSAPP_ACCESS_TOKEN (24hr expiry in dev)

### [37.0.0] - 2025-07-15 - CURRENT - Custom Password Reset Flow
- **Solution**: Custom branded flow replacing Auth0 verification emails
- **Email Service**: Resend (replaced SMTP)
- **Security**: 24-hour tokens, single-use, cryptographically secure
- **Environment**: `RESEND_API_KEY=re_gjPas9S7_3fVGrgpUKaazigEEa6o3MVkQ`

### [38.0.0] - 2025-07-15 - CURRENT - WhatsApp Commerce Menu Settings
- **Database**: `show_whatsapp_commerce` field in UserProfile
- **API**: `/api/users/me/` GET/PATCH for preferences
- **UI**: Settings → WhatsApp tab with country-based defaults
- **Real-time**: Custom event for instant menu updates

### [39.0.0] - 2025-07-17 - CURRENT - Complete Payroll Workflow System
- **Workflow**: Settings → Timesheet → Approval → Processing → Pay Stubs
- **Features**: 7-step wizard, geofencing, multi-country support
- **Revenue**: 2.4% platform fee on all payroll
- **Documentation**: `/backend/pyfactor/docs/PAYROLL_WORKFLOW_DOCUMENTATION.md`

### [40.0.0] - 2025-07-17 - CURRENT - Comprehensive Geofencing System
- **Compliance**: GDPR, CCPA compliant with employee consent
- **Features**: Google Maps interface, 10-1000m radius, location types
- **Privacy**: 90-day retention, encrypted storage, work-hours only
- **Documentation**: `/backend/pyfactor/docs/GEOFENCING_SYSTEM_DOCUMENTATION.md`

### [41.0.0] - 2025-07-20 - CURRENT - Session Cookie Persistence Fix
- **Problem**: Cloudflare proxy doesn't forward Set-Cookie headers reliably
- **Solution**: Client-side JavaScript cookie setting
- **Key Learning**: Always test cookie persistence with Cloudflare
- **Debug Tools**: `/api/auth/session-verify` endpoint

### [42.0.0] - 2025-07-21 - CURRENT - Google Maps Geofencing Implementation
- **API Key**: `AIzaSyCC7KgQRztJDsoaQa94zMO7F4Pa-4R73E0`
- **Features**: Click to place, drag to move, resize radius
- **Config**: `/src/config/maps.js` centralized configuration
- **Documentation**: `/docs/GOOGLE_MAPS_GEOFENCING_SETUP.md`

### [43.0.0] - 2025-07-22 - CURRENT - Local Docker Development Environment
- **Stack**: PostgreSQL, Redis, Django, Next.js
- **Frontend**: http://localhost:3000 with hot reload
- **Commands**: `docker-compose -f docker-compose.local.yml up -d`
- **Documentation**: `LOCAL_DEVELOPMENT_GUIDE.md`

### [44.0.0] - 2025-07-23 - CURRENT - Branch Structure Standardization
- **Production Branch**: main (replaced Dott_Main_Dev_Deploy)
- **Staging Branch**: staging (active for testing)
- **Deployment**: staging → main (after verification)
- **Benefits**: Industry standard, cleaner workflow

### [45.0.0] - 2025-08-15 - CURRENT - Staging Environment Active
- **Status**: ACTIVE - Staging environment is running
- **Development**: All work goes through staging branch first
- **Testing**: All changes must be tested on staging before production
- **Memory Fix**: NODE_OPTIONS=--max-old-space-size=4096

### [46.0.0] - 2025-07-25 - CURRENT - User-Employee Architecture Standardization
- **Pattern**: User (auth) → UserProfile (extended) → Employee (optional HR)
- **Key Change**: Audit fields use User instead of Employee
- **Helper Functions**: `/backend/pyfactor/hr/utils.py`
- **Benefits**: Business owners can use features without Employee records

### [47.0.0] - 2025-07-26 - CURRENT - Business Type-Based Feature Access
- **Categories**: SERVICE (Jobs), RETAIL (POS), MIXED/OTHER (both)
- **API**: `/api/users/business-features/` returns enabled features
- **Legacy Users**: See both features (before 2025-07-26)
- **Migration**: Add `simplified_business_type` field

### [48.0.0] - 2025-07-26 - CURRENT - Session Timeout Security Feature
- **Timeout**: 15 minutes of inactivity
- **Warning**: 60-second countdown modal at 14 minutes
- **Activity**: Mouse, keyboard, clicks, scrolls, API calls
- **Security**: Clears all session data and redirects to signin

### [49.0.0] - 2025-07-29 - CURRENT - App Subdomain Architecture
- **Marketing**: dottapps.com, www.dottapps.com
- **Application**: app.dottapps.com (Cloudflare proxied)
- **API**: api.dottapps.com (DNS only - no proxy)
- **Auth**: auth.dottapps.com (Auth0 custom domain)

### [50.0.0] - 2025-07-29 - CURRENT - Multi-Currency Display
- **Support**: 170+ currencies with real-time rates
- **Settlement**: All payments in USD
- **Caching**: 4 hours normal, 1 hour volatile currencies
- **UI**: Settings → Business → Currency Preferences
- **Documentation**: `/docs/MULTI_CURRENCY_FEATURE.md`

### [51.0.0] - 2025-08-02 - CURRENT - Simplified Currency Selection
- **Implementation**: 170 hardcoded currencies, no external APIs
- **UI**: Simple dropdown with confirmation modal
- **Display**: 3-letter currency codes in dashboard (USD, EUR, etc.)
- **No Exchange Rates**: Display only, no conversion calculations
- **Documentation**: `/docs/CURRENCY_SELECTION_FEATURE.md`

### [52.0.0] - 2025-08-02 - CURRENT - Simplified Accounting Standards
- **Options**: IFRS or US GAAP only
- **Auto-Detection**: US businesses default to GAAP, others to IFRS
- **Manual Override**: Users can change in Settings → Business
- **Removed**: Inventory methods, statement naming, complex rules
- **Documentation**: `/docs/ACCOUNTING_STANDARDS_FEATURE.md`

### [53.0.0] - 2025-08-06 - CURRENT - Wise/Stripe Banking Integration
- **Purpose**: Enable non-Plaid countries to receive POS payments via Wise
- **Security**: Bank details stored in Stripe Connect, only last 4 digits local
- **Payment Flow**: Customer → Stripe → Platform → Wise → User Bank
- **Fees**: Platform 0.1% + $0.30 profit, Wise fees paid by user
- **Webhook**: `/api/payments/webhooks/stripe/pos-settlements/`
- **Documentation**: `/docs/WISE_STRIPE_INTEGRATION.md`

### [54.0.0] - 2025-08-06 - CURRENT - Industry-Standard Middleware Architecture
- **Achievement**: Reduced from 26 to 10 middleware (62% reduction)
- **Performance**: 5x faster request processing, 80% less memory
- **Solution**: UnifiedTenantMiddleware + UnifiedSessionMiddleware
- **Key Fix**: Webhook authentication issues resolved
- **Configuration**: TENANT_EXEMPT_PATHS for public endpoints
- **Impact**: Lower costs, better UX, easier debugging
- **Documentation**: `/docs/MIDDLEWARE_ARCHITECTURE_2025.md`
- **Fees**: Card: Stripe (2.9% + $0.30) + Platform (0.1% + $0.30) = Total 3.0% + $0.60
- **Mobile Money Fees**: 2% platform fee only
- **Bank Transfer Fees**: 0.1% + $0.30 platform fee + Wise fees (user pays)
- **Webhook**: `/api/payments/webhooks/stripe/pos-settlements/`
- **Cron Job**: Daily settlement processing at 2 AM UTC
- **Countries**: 80+ non-Plaid countries supported
- **Minimum Settlement**: $10 (configurable)
- **Documentation**: `/docs/WISE_STRIPE_INTEGRATION.md`
- **Key Files**: 
  - `/banking/models.py` (WiseItem, PaymentSettlement)
  - `/banking/services/wise_service.py`
  - `/banking/services/stripe_bank_service.py`
  - `/Settings/banking/page.js`

### [55.0.0] - 2025-08-09 - CURRENT - Banking Integration Fixes
- **Fixed Issues**: Country detection, field mismatches, database errors
- **Key Changes**: BankAccount uses `last_synced` not `created_at`
- **Field Mapping**: Backend `connection_id` → Frontend `id`
- **Country Display**: Shows full name ("South Sudan") but stores ISO code ("SS")
- **Provider Logic**: PLAID_COUNTRIES list determines provider selection
- **Error Handling**: Added defensive checks for undefined connections
- **Documentation**: `/docs/BANKING_INTEGRATION_DOCUMENTATION.md`
- **Test Coverage**: Successful creation, listing, and deletion of bank accounts
- **Key Learning**: Always check actual model fields, not assumptions

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
- **Payment Processing**: Basic Stripe → Express Connect → Platform fees

### Current Pricing
- **Basic** (Free): 1 user, 3GB storage
- **Professional**: $15/mo or $144/year (50% off for developing countries)
- **Enterprise**: $45/mo or $432/year (50% off for developing countries)
- **Billing Options**: Monthly, 6-month (17% off), Yearly (20% off)

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

### Delete Users (Interactive)
```bash
cd /backend/pyfactor/scripts
python interactive_user_cleanup.py
```

### Delete Orphaned Users (Comprehensive)
```bash
cd /backend/pyfactor/scripts
python comprehensive_user_cleanup.py user@example.com
```

### Local Testing Commands
```bash
docker-compose up db redis --detach
python3 -m py_compile *.py
docker-compose build backend
docker-compose exec backend python manage.py check
```

### Test Platform Fees
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python3 payments/test_platform_fees.py
```

### Test Webhook (POS Settlements)
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python3 scripts/test_pos_webhook.py --local
```

### Process Settlements Manually
```bash
python manage.py process_settlements --minimum 10 --dry-run
python manage.py process_settlements --user-id <user_id>
```

### Check Middleware Configuration
```bash
python3 manage.py shell
>>> from django.conf import settings
>>> len(settings.MIDDLEWARE)  # Should be 10, not 26
```

### Environment Variables (Key)
```
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_SMART_INSIGHTS_API_KEY=sk-ant-api03-...
REDIS_URL=redis://...
AUTH0_M2M_CLIENT_ID=...
STRIPE_SECRET_KEY=sk_...
STRIPE_EXPRESS_ACCOUNT_ID=acct_1RkYGFC77wwa4lUB
WHATSAPP_ACCESS_TOKEN=<generate-from-meta-business-platform>
WHATSAPP_PHONE_NUMBER_ID=676188225586230
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCC7KgQRztJDsoaQa94zMO7F4Pa-4R73E0
CURRENCY_API_KEY=cur_live_jE7Pw20yFxMkRhfGR8cmwEFHP8HB2JCQOUEOg0lc
WISE_API_KEY=<optional-for-better-rates>
RESEND_API_KEY=re_gjPas9S7_3fVGrgpUKaazigEEa6o3MVkQ
```

### [56.0.0] - 2025-11-10 - CURRENT - Comprehensive Security Hardening
- **Security Score**: A- (88/100) - Up from C+ (65/100)
- **CSP Implementation**: Industry-standard with nonce + SHA-256 hash
- **Critical Fixes**: 
  - Removed SKIP_TOKEN_VERIFICATION authentication bypass
  - Fixed DEBUG=True in production (now False)
  - Implemented dynamic CSP middleware with nonces
  - Fixed container security with non-root user
- **Session Security**: Bank-grade AES-256-CBC encryption
- **Tenant Isolation**: Multi-layer defense fully operational
- **Security Tools**: 
  - `/scripts/security-env-audit.sh` - Environment scanning
  - `/scripts/generate-secure-credentials.py` - Secure key generation
  - `/scripts/test-csp-security.py` - CSP verification
- **Middleware**: Dynamic CSP at `/frontend/pyfactor_next/middleware.js`
- **Auth Hash**: `sha256-mHVJrqf405kt9COJfFfRNPGPFhA9M8E0mexi7ETxbsc=`
- **Documentation**: 
  - `/SECURITY_ENHANCEMENTS_SUMMARY.md` - Complete security status
  - `/docs/CSP_INDUSTRY_STANDARD_IMPLEMENTATION.md` - CSP guide
- **Required Before Production**:
  - Generate new Django SECRET_KEY
  - Ensure DEBUG=False in all production configs
  - Run security audit: `./scripts/security-env-audit.sh`