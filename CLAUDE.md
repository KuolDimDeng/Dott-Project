# CLAUDE.md - Dott Project Configuration
*Last Updated: 2025-07-14*

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

### [30.0.0] - 2025-07-09 - CURRENT - Subscription Regional Pricing & Payment Methods
- **Purpose**: Implement regional pricing with local payment methods for developing countries
- **Subscription Plans**:
  - Basic: Free forever (1 user, 3GB storage)
  - Professional: $15/mo ($7.50 developing countries)
  - Enterprise: $45/mo ($22.50 developing countries)
- **Billing Cycles**: Monthly, 6-month (17% off), Yearly (20% off)
- **Regional Pricing**:
  - 128 developing countries get automatic 50% discount
  - Detected from country selected during onboarding
  - No manual codes needed - automatic application
- **Payment Methods by Country**:
  - Kenya: Credit Card (USD) or M-Pesa (KES)
  - Nigeria: Credit Card or Flutterwave
  - Ghana/Uganda/Rwanda: Credit Card or MTN Mobile Money
  - Tanzania: Credit Card or M-Pesa
  - Others: Credit Card only
- **Implementation**:
  - Payment page detects country from onboarding data
  - Shows appropriate payment methods
  - Displays local currency with exchange rate
  - M-Pesa integration for Kenya users
- **Key Files**:
  - `/src/app/onboarding/payment/page.js` - Payment page with regional support
  - `/src/app/api/payments/mpesa/initiate/route.js` - M-Pesa payment API
  - `/src/app/api/payment-methods/available/route.js` - Payment method detection
  - `/docs/SUBSCRIPTION_PRICING.md` - Complete pricing documentation

### [31.0.0] - 2025-07-12 - CURRENT - Interactive User Cleanup Tool
- **Purpose**: Safe, menu-driven interface for deleting users from production database
- **Features**:
  - Delete specific user by email with confirmation
  - Delete ALL users with double confirmation (requires typing "DELETE ALL USERS")
  - List all users with ID, email, and username
  - Handles all 64 dependent tables in correct deletion order
- **Location**: `/backend/pyfactor/scripts/interactive_user_cleanup.py`
- **Usage**: `python interactive_user_cleanup.py` (requires DATABASE_URL)
- **Safety**:
  - Email validation and user existence check
  - Confirmation prompts for all deletions
  - Transaction-based with rollback on error
  - Clear error messages and progress feedback
- **Documentation**: `/backend/pyfactor/docs/INTERACTIVE_USER_CLEANUP.md`

### [31.0.0] - 2025-07-12 - CURRENT - Employee API V2 Implementation
- **Purpose**: Complete rewrite of employee API to fix serialization and async issues
- **Problem**: Employee creation returned empty arrays, [object Promise] tenant IDs
- **Solution**: Clean V2 API with consistent response format
- **Key Changes**:
  - New `/api/hr/v2/employees` endpoints with proper serialization
  - Fixed async/await in Next.js proxy routes (cookies() not awaited)
  - Auto-format phone numbers to international format
  - Fixed DateField default to return date() not datetime()
  - Consistent response format: `{success: true, data: {...}, message: "..."}`
- **Migration**: Updated all frontend hrApi calls to use v2 endpoints
- **Cleanup**: Removed all old employee API files after v2 working

### [32.0.0] - 2025-07-13 - CURRENT - User Cleanup Scripts & Transaction Atomic
- **Purpose**: Handle orphaned users and prevent future occurrences
- **Problem**: User creation failures left orphaned records with 64+ foreign key dependencies
- **Solution**: Comprehensive cleanup script with transaction atomic
- **Key Features**:
  - `/backend/pyfactor/scripts/comprehensive_user_cleanup.py` - Auto-discovers ALL foreign keys
  - `@transaction.atomic` on user creation prevents orphaned records
  - Handles tables: smart_insights_credittransaction, smart_insights_usercredit, hr_employee, etc.
  - Shows all 64+ dependencies before deletion
- **Usage**: `python comprehensive_user_cleanup.py user@example.com`
- **Prevention**: All user creation now wrapped in atomic transactions
- **Documentation**: `/backend/pyfactor/docs/TROUBLESHOOTING.md` - User cleanup section

### [33.0.0] - 2025-07-14 - CURRENT - Stripe Connect SSN Storage
- **Purpose**: PCI-compliant SSN storage for employees using Stripe Connect
- **Express Account**: acct_1RkYGFC77wwa4lUB (Dott LLC)
- **Implementation**:
  - SSNs stored as Customer records in Express account
  - Only last 4 digits kept locally
  - Secure hashing for references
  - Automatic Stripe account cleanup on deletion
- **Key Files**:
  - `/backend/pyfactor/hr/stripe_ssn_service_express.py` - Express account integration
  - `/backend/pyfactor/hr/stripe_config.py` - Stripe configuration
  - `/backend/pyfactor/scripts/migrate_existing_ssns_to_stripe.py` - Migration script
  - `/STRIPE_SSN_MIGRATION_GUIDE.md` - Step-by-step migration guide

### [34.0.0] - 2025-07-14 - CURRENT - Platform Fee Structure
- **Purpose**: Revenue generation through transaction fees
- **Fee Structure**:
  - Invoice Payments: 2.9% + $0.60 (profit: $0.30/transaction)
  - Vendor Payments: 2.9% + $0.60 (profit: $0.30/transaction)
  - Payroll: 2.4% (configurable)
  - Subscriptions: 2.5% (configurable)
- **Implementation**:
  - Automatic fee calculation on all payments
  - Transparent fee display to users
  - Uses Stripe application_fee_amount
  - Complete fee tracking and analytics
- **Key Files**:
  - `/backend/pyfactor/payments/stripe_fees.py` - Fee calculation logic
  - `/backend/pyfactor/payments/stripe_payment_service.py` - Payment processing
  - `/backend/pyfactor/payments/api.py` - Payment API endpoints
  - `/frontend/pyfactor_next/src/components/payments/InvoicePaymentModal.js` - Payment UI
  - `/backend/pyfactor/PLATFORM_FEE_DOCUMENTATION.md` - Complete documentation
- **Revenue Projections**:
  - 100 transactions/month = $30
  - 1,000 transactions/month = $300
  - 10,000 transactions/month = $3,000

### [35.0.0] - 2025-07-14 - CURRENT - WhatsApp Business API Integration
- **Purpose**: Enable business owners to invite others via WhatsApp messages
- **Meta App Details**:
  - App ID: 1068741974830721
  - Phone Number ID: 676188225586230
  - WhatsApp Business Account ID: 1513500473389693
  - Test Number: +1 555 190 5954 (90 days free messages)
- **Features**:
  - Send invitation messages via WhatsApp
  - Support for both text and template messages
  - Integration with "Invite a Business Owner" feature
  - Future support for invoice notifications and payment confirmations
- **Implementation**:
  - Frontend proxy: `/src/app/api/invite/whatsapp/route.js`
  - Backend service: `/backend/pyfactor/communications/whatsapp_service.py`
  - API endpoints: `/backend/pyfactor/invitations/views.py`
  - UI component: `/src/app/dashboard/components/invite/InviteAFriend.js`
- **Environment Variables** (Add to Render Backend):
  - `WHATSAPP_ACCESS_TOKEN`: Generated from Meta Business Platform (24hr expiry in dev)
  - `WHATSAPP_PHONE_NUMBER_ID`: 676188225586230 (optional, defaults to this)
- **Setup Steps**:
  1. Generate access token in Meta Business Platform
  2. Add environment variables to Render Backend
  3. Test from "Invite a Business Owner" page
- **Future Enhancements**:
  - Invoice notification templates
  - Payment confirmation messages
  - Appointment reminders
  - Marketing campaigns

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
```
