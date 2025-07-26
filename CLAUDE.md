# CLAUDE.md - Dott Project Configuration
*Last Updated: 2025-07-17*

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
- **Domains**: dottapps.com, www.dottapps.com
- **Branch Structure**: staging → main (production)

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

### [36.0.0] - 2025-07-15 - CURRENT - Custom Password Reset Flow for Admin-Created Users
- **Purpose**: Replace Auth0's confusing verification emails with branded password reset flow
- **Problem**: Users received Auth0 welcome/verification emails instead of password reset
- **Solution**: Custom password reset system with full Auth0 integration
- **Implementation**:
  - `PasswordResetToken` model with 24-hour expiry
  - Custom email via Resend with branded template
  - Frontend page at `/auth/set-password` for password setting
  - Backend API updates password in Auth0 via Management API
  - Marks users as `onboarding_completed` after password set
- **Email Service**: Switched from SMTP to Resend (better deliverability)
- **Security**: Cryptographically secure tokens, single-use, time-limited
- **Key Files**:
  - `/backend/pyfactor/custom_auth/models.py` - PasswordResetToken model
  - `/backend/pyfactor/custom_auth/views/password_reset_views.py` - API endpoint
  - `/frontend/pyfactor_next/src/app/auth/set-password/page.js` - Frontend page
  - `/backend/pyfactor/custom_auth/views/rbac_views.py` - Email sending logic
- **Documentation**: 
  - `/backend/pyfactor/docs/CUSTOM_PASSWORD_RESET_FLOW.md`
  - `/backend/pyfactor/docs/RESEND_SETUP.md`
- **Environment**: `RESEND_API_KEY=re_gjPas9S7_3fVGrgpUKaazigEEa6o3MVkQ` configured in Render

### [37.0.0] - 2025-07-17 - CURRENT - Complete Payroll Workflow System
- **Purpose**: End-to-end payroll system from settings to final payment with industry-standard compliance
- **Documentation**: `/backend/pyfactor/docs/PAYROLL_WORKFLOW_DOCUMENTATION.md`
- **Complete Workflow**:
  1. **Payroll Settings** (Settings → Payroll tab): Configure pay frequency, dates, overtime, notifications
  2. **Timesheet Entry** (2-week period): Excel-style grid with multiple hour types and geofencing
  3. **Supervisor Approval**: Manager reviews and approves employee timesheets
  4. **HR Final Approval**: HR compliance review and final approval
  5. **7-Step Payroll Processing**: Employee selection → calculation → payment → pay stubs
  6. **Employee Access**: PWA-compatible pay stub viewing via Profile → Documents
  7. **Compliance**: Automated reporting, audit trails, tax calculations
- **Key Components**:
  - `PayrollSettings.js` - Comprehensive payroll configuration
  - `EnhancedTimesheet.js` - Pay period-aligned timesheet with navigation
  - `SupervisorApprovals.js` - Approval workflow management
  - `PayrollProcessingWizard.js` - 7-step payroll processing
  - `PayStubViewer.js` - Employee pay stub access (PWA mobile compatible)
  - `PayManagement.js` - HR pay management interface
- **Backend Models**:
  - `PayrollSettings`: Pay frequency, overtime, notifications configuration
  - `Timesheet`: Weekly timesheet with status tracking (draft/submitted/approved/rejected/paid)
  - `TimeEntry`: Daily entries (regular/overtime/sick/vacation/holiday/unpaid/other hours)
  - `ClockEntry`: Clock in/out/break tracking with location data
  - `PayStatement`: Generated pay stubs with PDF download
  - `GeofenceZone`: Location-based zones for clock validation
- **API Endpoints**:
  - `/api/payroll/settings/` - Payroll configuration
  - `/api/timesheets/` - Timesheet management
  - `/api/timesheets/current_week/` - Current timesheet
  - `/api/timesheets/{id}/submit/` - Submit for approval
  - `/api/timesheets/{id}/approve/` - Approve/reject timesheet
  - `/api/payroll/process/` - 7-step payroll processing
  - `/api/paystubs/` - Pay stub access
  - `/api/paystubs/{id}/download/` - PDF download
- **Revenue Model**: 2.4% platform fee on all payroll transactions
- **Security**: Row-Level Security (RLS), session-based auth, audit logging
- **Mobile Support**: PWA-compatible timesheet entry and pay stub viewing
- **Compliance**: Tax calculations, W-2 generation, record retention
- **Setup Requirements**:
  - Run migrations: `python manage.py makemigrations payroll timesheets && python manage.py migrate`
  - Add Google Maps API key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - Configure Stripe for payment processing
  - Set up geofence zones per business location

### [38.0.0] - 2025-07-17 - CURRENT - Comprehensive Geofencing System
- **Purpose**: Location-based employee time tracking with full legal compliance and privacy protection
- **Documentation**: `/backend/pyfactor/docs/GEOFENCING_SYSTEM_DOCUMENTATION.md`
- **Admin Interface**: Settings → Geofencing (Admin/Owner only)
- **Legal Compliance**:
  - GDPR, CCPA, and local privacy law compliance
  - Mandatory employee notification and explicit consent
  - Comprehensive employer responsibility documentation
  - Employee rights protection (opt-out, data access, deletion)
  - 90-day automatic data retention with encrypted storage
- **Geofence Setup**:
  - Interactive Google Maps interface with click-to-place
  - Adjustable radius (10-1000 meters) with visual feedback
  - Location types: Office, Construction Site, Client Location, Delivery Zone, Field Location, Custom
  - Configurable rules: Clock in/out requirements, auto clock-out, exit alerts
- **Employee Experience**:
  - Location consent modal with GDPR-compliant information
  - Real-time geofence validation during clock in/out
  - Status indicators (inside/outside work areas)
  - Distance calculations from geofence centers
  - PWA-compatible mobile interface
- **Technical Implementation**:
  - `GeofencingSettings.js` - Admin geofence management with Google Maps
  - `EnhancedClockInOut.js` - Location-aware time tracking
  - `LocationConsentModal` - GDPR-compliant consent collection
  - `GeofenceStatus` - Real-time location validation indicators
- **Backend Models**:
  - `Geofence` - Location boundaries with enforcement rules
  - `EmployeeLocationConsent` - Privacy consent tracking
  - `GeofenceEvent` - Comprehensive audit logging
  - `LocationLog` - Employee location history
- **API Endpoints**:
  - `/api/hr/geofences/` - Geofence CRUD operations
  - `/api/hr/location-consents/check/me/` - Employee consent status
  - `/api/hr/geofence-events/check/` - Real-time geofence validation
  - `/api/hr/geofence-events/log_event/` - Event logging for compliance
- **Privacy & Security**:
  - AES-256 encryption for all location data
  - Role-based access control with audit trails
  - Work-hours only tracking with automatic deletion
  - Granular consent controls and withdrawal options
  - Complete GDPR compliance with data portability
- **Mobile & PWA Support**:
  - Native GPS integration with high-accuracy positioning
  - Touch-friendly interface optimized for mobile
  - Offline capability with background sync
  - Battery-optimized location tracking
  - Push notifications for location-based alerts
- **Setup Requirements**:
  - Google Maps API key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - Legal compliance review and employer training
  - Employee notification and consent collection
  - Geofence zone configuration per business location

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

### [42.0.0] - 2025-07-23 - CURRENT - Branch Structure Standardization
- **Purpose**: Switched from Dott_Main_Dev_Deploy to industry-standard main branch
- **Production Branch**: main (was Dott_Main_Dev_Deploy)
- **Staging Branch**: staging
- **Deployment Flow**: staging → main
- **Deployment Scripts**:
  - `./deploy-to-staging.sh` - Deploy current branch to staging
  - `./deploy-to-production.sh` - Merge staging to main and deploy
- **Render Services**: Both configured to auto-deploy from respective branches
- **Benefits**: Cleaner workflow, industry standard, easier for new developers

### [43.0.0] - 2025-07-24 - CURRENT - Staging Environment Suspension
- **Purpose**: Temporarily suspend staging to focus on customer acquisition
- **Status**: Staging services suspended in Render (saving $57/month)
- **Development**: All work on main branch, deploy directly to production
- **Rationale**: 0 users - infrastructure optimization is premature
- **Reactivation Criteria**: 10+ paying customers or $1000+ MRR
- **Documentation**: See STAGING_SUSPENSION_NOTICE.md
- **Memory Fix**: NODE_OPTIONS set to 4GB in package.json and Dockerfile

### [44.0.0] - 2025-07-25 - CURRENT - User-Employee Architecture Standardization
- **Purpose**: Standardize User-Employee relationship following industry best practices
- **Problem**: Geofence creation failed because created_by required Employee, but business owners don't have Employee records
- **Architecture Pattern**:
  - User model: Core authentication and authorization (all users have this)
  - UserProfile: Extended user data (address, phone, preferences)
  - Employee model: Optional HR-specific data (only employees have this)
  - Business owners, admins, and external users only have User records
- **Key Changes**:
  - All audit fields (created_by, approved_by, etc.) now use User ForeignKey instead of Employee
  - Employee.business_id is now a property that gets value from User relation
  - Created UserRole enum with existing OWNER, ADMIN, USER values
  - Added comprehensive helper functions in hr/utils.py
- **Helper Functions** (in `/backend/pyfactor/hr/utils.py`):
  - `get_employee_for_user(user)` - Get Employee or None
  - `create_employee_for_user(user, **kwargs)` - Create Employee if needed
  - `user_has_employee_profile(user)` - Check if user has Employee
  - `get_user_display_name(user)` - Get name regardless of Employee status
  - `is_user_employee(user)` - Check if user is employee (not owner)
  - `get_user_role_display(user)` - Get human-readable role
- **Models Updated**:
  - Geofence.created_by: Employee → User
  - EmployeeGeofence.assigned_by: Employee → User
  - Timesheet.approved_by: Employee → User
  - ClockEntry.adjusted_by: Employee → User
  - TimeOffRequest.reviewed_by: Employee → User
  - BonusPayment.approved_by: UUIDField → User
- **Migrations Created**:
  - hr/migrations/0003_change_geofence_created_by_to_user.py
  - timesheets/migrations/0002_change_audit_fields_to_user.py
  - payroll/migrations/0002_change_bonuspayment_approved_by_to_user.py
- **Views Updated**: All views now use helper functions instead of direct user.employee access
- **Benefits**:
  - Business owners can now create geofences without Employee records
  - Cleaner separation between authentication (User) and HR data (Employee)
  - More flexible for future user types (customers, vendors, contractors)
  - Consistent audit trail using User model
- **Best Practices**:
  - Use User for audit fields (created_by, modified_by)
  - Use Employee only for HR-specific relationships
  - Always handle cases where User has no Employee gracefully

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

### Geofencing Setup (Admin)
```bash
# 1. Access Settings → Geofencing (Admin/Owner only)
# 2. Accept legal compliance requirements
# 3. Create geofence using Google Maps interface
# 4. Configure location rules and requirements
# 5. Assign employees to geofences
```

### Employee Location Consent
```bash
# Employee workflow:
# 1. First clock in attempt triggers consent modal
# 2. Review location data collection details
# 3. Accept or decline location tracking
# 4. Clock in/out with geofence validation
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
```

### [36.0.0] - 2025-07-15 - CURRENT - WhatsApp Commerce Menu Settings
- **Purpose**: Database-backed user preference for WhatsApp Commerce menu visibility
- **Problem Solved**: Previous localStorage approach didn't sync across devices/browsers
- **Database Changes**:
  - Added `show_whatsapp_commerce` BooleanField to UserProfile model
  - NULL = use country default, TRUE/FALSE = explicit user preference
  - Method `get_whatsapp_commerce_preference()` returns effective setting
- **API Implementation**:
  - Extended `/api/users/me/` GET to include WhatsApp preferences
  - Added PATCH method to `/api/users/me/` for updating preferences
  - Returns both `show_whatsapp_commerce` (effective) and `whatsapp_commerce_explicit` (user setting)
- **Frontend Implementation**:
  - Settings → WhatsApp tab for all users
  - Shows country status (Popular/New/Available) with explanation
  - Toggle for menu visibility with real-time API updates
  - Custom event `whatsappPreferenceChanged` for instant menu updates
- **Logic Flow**:
  - WhatsApp Business countries: Show by default, user can disable
  - Non-WhatsApp Business countries: Hidden by default, user can enable
  - listItems.js uses profile data instead of localStorage
  - Real-time updates without page refresh
- **Key Files**:
  - `/backend/pyfactor/users/models.py` - Database field and logic
  - `/backend/pyfactor/users/api/user_profile_views.py` - API endpoints
  - `/src/app/Settings/components/sections/WhatsAppSettings.js` - Settings UI
  - `/src/app/Settings/components/SettingsManagement.js` - Added WhatsApp tab
  - `/src/app/dashboard/components/lists/listItems.js` - Menu conditional logic

### [39.0.0] - 2025-07-20 - CURRENT - Session Cookie Persistence Fix (Cloudflare)
- **Purpose**: Fix session cookies not persisting through Cloudflare proxy, causing authentication loops
- **Problem**: 2-day debugging - cookies set with server-side headers weren't persisting
- **Root Causes**:
  - Cloudflare proxy doesn't reliably forward Set-Cookie headers
  - Cookies with `sameSite: 'lax'` don't persist in cross-origin contexts
  - Import errors ("t is not defined") masking authentication issues
  - Incorrect `useSession` hook destructuring
- **Solution**:
  - Use client-side JavaScript to set cookies instead of server headers
  - Set cookies with `sameSite: 'none'` and `secure` attributes
  - Fix all import/export errors before debugging auth issues
  - Create session-verify endpoint for debugging
- **Implementation**:
  - JavaScript cookie setting in `/src/app/api/auth/establish-session-form/route.js`
  - Return HTML with script that sets cookies then redirects
  - Keep session bridge pattern but use form submission
  - Fix `useSession` destructuring: `{ session, user }` not `{ data }`
- **Key Learning**: Cloudflare requires client-side cookie setting for reliability
- **Debug Tools**:
  - Check cookies: `document.cookie.split(';').map(c => c.trim())`
  - Verify session: `/api/auth/session-verify` endpoint
  - Add comprehensive logging throughout auth flow
- **Prevention**: Always test cookie persistence in production with Cloudflare
- **Documentation**: Added to `/frontend/pyfactor_next/docs/TROUBLESHOOTING.md`

### [40.0.0] - 2025-07-21 - CURRENT - Google Maps Geofencing Implementation
- **Purpose**: Enable location-based employee time tracking with interactive map interface
- **Problem**: Geofencing creation wasn't working - map not displaying, save button non-functional
- **Root Causes**:
  - Environment variables not loading in client-side build
  - React portal timing issues with map container
  - Invalid Google Maps API key
  - Missing error handling in save functionality
- **Solution**:
  - Created centralized maps config: `/src/config/maps.js`
  - Simplified component removing portal pattern
  - Added proper API key: `AIzaSyCC7KgQRztJDsoaQa94zMO7F4Pa-4R73E0`
  - Enhanced save functionality with detailed error handling
- **Features Added**:
  - Click on map to place geofence circle
  - Double-click to remove circle (map or circle)
  - Drag to reposition, resize by dragging edge
  - Real-time coordinate and radius display
  - Loading states and error messages
  - Disabled save until required fields filled
- **Implementation**:
  - `/src/app/Settings/components/sections/GeofencingSettingsSimple.js` - Main component
  - `/src/config/maps.js` - Google Maps configuration
  - `/src/app/api/hr/geofences/route.js` - API proxy route
  - Backend ViewSet at `/backend/pyfactor/hr/views.py`
- **User Experience**:
  - Settings → Geofencing (Admin/Owner only)
  - Accept legal compliance on first use
  - Click "Add Geofence" to create new
  - Click map to place, adjust radius, configure rules
  - Save creates geofence in backend
- **Documentation**: `/docs/GOOGLE_MAPS_GEOFENCING_SETUP.md`
- **Key Learning**: Direct DOM manipulation more reliable than React portals for Google Maps

### [41.0.0] - 2025-07-22 - CURRENT - Local Docker Development Environment
- **Purpose**: Mirror production environment locally for faster development and testing
- **Problem**: Needed to test changes locally before deploying to Render production
- **Solution**: Complete Docker Compose setup replicating production stack
- **Key Files Created**:
  - `docker-compose.local.yml` - Full stack configuration (PostgreSQL, Redis, Django, Next.js)
  - `frontend/pyfactor_next/Dockerfile.local` - Frontend container with hot reload
  - `frontend/pyfactor_next/.dockerignore` - Exclude node_modules from build
  - `.env.local.example` - Template for environment variables
  - `scripts/setup-local-dev.sh` - Automated setup script
  - `backend/pyfactor/scripts/seed_local_data.py` - Sample data creation
  - `LOCAL_DEVELOPMENT_GUIDE.md` - Complete documentation
- **Working Services**:
  - Frontend: http://localhost:3000 ✅ (full landing page with hot reload)
  - PostgreSQL: localhost:5432 ✅ (database ready)
  - Redis: localhost:6379 ✅ (session storage ready)
  - Backend: localhost:8000 🔧 (migration dependency issues)
- **Key Benefits**:
  - Instant frontend changes without waiting for deployments
  - Test all 20 language translations locally
  - Verify responsive design across devices
  - Safe environment to break things
  - Exact production parity (same versions, configs)
- **Usage**:
  - Start: `docker-compose -f docker-compose.local.yml up -d`
  - View logs: `docker-compose -f docker-compose.local.yml logs -f`
  - Stop: `docker-compose -f docker-compose.local.yml down`
  - Frontend changes: Edit files in `/frontend/pyfactor_next/src/`
- **Common Issues**:
  - Backend migration error: `NodeNotFoundError` - needs migration dependency fix
  - Docker build cache: Run `docker system prune -f` to clear
  - Port conflicts: Change ports in docker-compose.local.yml
- **Development Workflow**:
  1. Make changes locally
  2. Test at http://localhost:3000
  3. When satisfied: `git push origin Dott_Main_Dev_Deploy`
  4. Render auto-deploys to production
- **Next Steps**: Fix Django migration dependencies for full backend functionality

### [45.0.0] - 2025-07-26 - CURRENT - Business Type-Based Feature Access (Jobs/POS)
- **Purpose**: Show Jobs or POS features based on business type selected during onboarding
- **Problem**: All users see all features regardless of their business type
- **Solution**: Simplified business types with feature-based menu filtering
- **Business Categories**:
  - SERVICE: Home Services, Construction, Cleaning, etc. → Shows Jobs only
  - RETAIL: Retail Store, Restaurant, Grocery, etc. → Shows POS only
  - MIXED: Salon/Spa, Medical, Fitness, etc. → Shows both Jobs and POS
  - OTHER: Logistics, Finance, Real Estate, etc. → Shows both Jobs and POS
- **Implementation**:
  - Backend: `simplified_business_type` field in BusinessDetails model
  - API: `/api/users/business-features/` returns enabled features array
  - Frontend: SimplifiedBusinessInfoForm.jsx for onboarding
  - Menu: Dynamic filtering in listItems.js based on features
- **Legacy Users**: All users onboarded before 2025-07-26 see both features
- **Key Files**:
  - `/backend/pyfactor/users/business_categories.py` - Feature configuration
  - `/backend/pyfactor/users/api/business_features_views.py` - API endpoint
  - `/frontend/pyfactor_next/src/components/Onboarding/SimplifiedBusinessInfoForm.jsx` - Form
  - `/frontend/pyfactor_next/src/app/utils/simplifiedBusinessData.js` - Frontend config
  - `/frontend/pyfactor_next/src/app/dashboard/components/lists/listItems.js` - Menu filtering
- **Migration**: Run `python manage.py migrate users` to add simplified_business_type field

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
