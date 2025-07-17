# Payroll Workflow Documentation
*Complete System Overview - Updated: 2025-07-17*

## Overview
This document describes the complete payroll workflow in the Dott application, from initial payroll settings configuration through final payment processing and employee access.

## 1. Payroll Settings Configuration
**Location**: Settings → Payroll tab (after Bank Connections)  
**Access**: OWNER/ADMIN only  
**File**: `/src/app/Settings/components/sections/PayrollSettings.js`

### Configuration Options:
- **Pay Frequency**: Daily, Weekly, Biweekly, Semi-monthly, Monthly, Quarterly
- **Pay Days**: Configurable based on frequency
  - Weekly/Biweekly: Select weekday (default: Friday)
  - Semi-monthly: Select 2 days of month (e.g., 15th & 30th)
  - Monthly: First day of month
- **Processing Lead Time**: 1-7 days before payday to start processing
- **Payment Options**:
  - Direct deposit (default enabled)
  - Bonus payments
  - Commission tracking
  - Recurring allowances
- **Overtime Settings**:
  - Enable/disable overtime calculations
  - Overtime rate multiplier (default: 1.5x)
- **Notification Settings**:
  - Employee notifications on payday
  - Admin notifications before processing
  - Notification lead time (1-7 days)

### Database Storage:
- Table: `payroll_settings`
- Fields: `pay_frequency`, `pay_days`, `pay_weekday`, `enable_direct_deposit`, `enable_bonuses`, `enable_overtime`, `overtime_rate`, `processing_lead_time`, etc.
- API: `/api/payroll/settings/`

## 2. Employee Timesheet Completion (Pay Period Duration)
**Location**: Dashboard → Timesheets or Profile menu quick actions  
**Access**: All employees  
**File**: `/src/app/dashboard/components/forms/timesheet/EnhancedTimesheet.js`

### Timesheet Features:
- **Excel-style grid** with light/dark green column shading
- **Multiple hour types**:
  - Regular hours
  - Overtime hours
  - Sick leave
  - Vacation/PTO
  - Holiday pay
  - Unpaid time
  - Other hours (with notes)
- **Clock in/out functionality** with optional location tracking
- **Geofencing** for location-based validation
- **Auto-calculation** of totals and estimated pay
- **Pay period navigation** aligned with payroll settings
- **Mobile-responsive** design

### Workflow:
1. System creates timesheet for current pay period
2. Employee enters daily hours
3. System calculates totals and estimated pay
4. Employee can save as draft or submit for approval
5. Submitted timesheets are locked from further editing

### Database Models:
- `Timesheet`: Weekly timesheet with status tracking
- `TimeEntry`: Daily entries with hour breakdowns
- `ClockEntry`: Clock in/out records with location
- `GeofenceZone`: Location-based validation zones

## 3. Supervisor/Manager Approval
**Location**: Dashboard → Timesheets → Supervisor Approvals  
**Access**: Employees with supervisor role  
**File**: `/src/app/dashboard/components/timesheets/SupervisorApprovals.js`

### Approval Process:
1. Supervisor views pending timesheets
2. Reviews hours, overtime, and time off requests
3. Can approve, reject, or request changes
4. Rejected timesheets return to employee with comments
5. Approved timesheets move to HR review
6. System tracks approval workflow and timestamps

### Status Flow:
- `draft` → `submitted` → `approved` → `hr_approved` → `paid`

## 4. HR Review and Final Approval
**Location**: HR → Timesheets → Final Review  
**Access**: HR staff and OWNER/ADMIN  

### HR Review Process:
1. Review all supervisor-approved timesheets
2. Verify compliance with company policies
3. Check overtime calculations and time-off balances
4. Final approval locks timesheet for payroll processing
5. System prevents further edits once HR-approved

## 5. Payroll Processing Workflow (7-Step Wizard)
**Location**: HR → Pay → Process Payroll  
**Access**: OWNER/ADMIN only  
**File**: `/src/app/dashboard/components/forms/payroll/PayrollProcessingWizard.js`

### Step 1: Review Employees
- Select employees to include in payroll run
- Filter by department, status, or pay period
- Verify employee information is current

### Step 2: Review Timesheets
- Final review of all approved timesheets
- System flags missing or problematic entries
- Bulk approval of remaining timesheets

### Step 3: Calculate Payroll
**System calculates**:
- Gross pay (regular + overtime + bonuses)
- Federal, state, and local taxes
- Social Security and Medicare (FICA)
- Benefits deductions (health insurance, 401k)
- Other deductions (garnishments, loans)
- Net pay amount

### Step 4: Review & Approve Calculations
- HR reviews all calculations for accuracy
- Manual adjustments if needed
- Detailed breakdown per employee
- Final approval to proceed with payments

### Step 5: Process Payments
**Payment Methods**:
- **Direct Deposit**: ACH transfers to employee bank accounts
- **Check Printing**: Physical checks for employees without banking
- **International Payments**: Wise/Stripe for global employees
- **Platform Fee**: 2.4% charged to employer

### Step 6: Generate Pay Stubs
- Creates detailed PDF pay stubs for each employee
- Includes earnings, deductions, taxes, YTD totals
- Automatically stores in system for employee access
- Email notifications sent to employees

### Step 7: Complete & Record
- Finalizes payroll run in system
- Updates employee YTD totals
- Generates payroll reports for accounting
- Archives all records for compliance

## 6. Employee Access to Pay Information
**Location**: Profile → Documents tab  
**Access**: All employees  
**File**: `/src/components/PayStubViewer.js`

### Employee Features:
- Email notification when paid
- Access pay stubs via Documents tab (PWA mobile compatible)
- View/download PDF pay stubs
- Payment history and YTD totals
- Access from any device including mobile
- Year-based filtering of pay stubs

### PWA Mobile Support:
- Responsive design for mobile devices
- PDF viewing through browser's native PDF viewer
- Download functionality for offline access
- Touch-friendly interface

## 7. Compliance and Reporting
**Automatic Features**:
- Required payroll reports generation
- Audit trail for all changes
- Record retention for tax filing
- Quarterly tax payment calculations
- W-2 preparation at year-end
- Labor law compliance tracking

## 8. Platform Revenue Model
**Revenue Structure**:
- **Payroll Processing**: 2.4% platform fee
- **Invoice Payments**: 2.9% + $0.60 (profit: $0.30)
- **Vendor Payments**: 2.9% + $0.60 (profit: $0.30)
- **Subscriptions**: 2.5% platform fee
- Transparent fee display to users
- Stripe handles payment processing

## Key Technical Components

### Frontend Components:
- `PayrollSettings.js` - Settings configuration
- `EnhancedTimesheet.js` - Timesheet entry and navigation
- `SupervisorApprovals.js` - Approval dashboard
- `PayrollProcessingWizard.js` - 7-step payroll processing
- `PayStubViewer.js` - Employee pay stub access
- `PayManagement.js` - HR pay management interface

### Backend Models:
- `PayrollSettings` - Pay frequency and configuration
- `Timesheet` - Weekly timesheet records
- `TimeEntry` - Daily hour entries
- `ClockEntry` - Clock in/out records
- `PayStatement` - Generated pay stubs
- `GeofenceZone` - Location validation

### API Endpoints:
- `/api/payroll/settings/` - Payroll configuration
- `/api/timesheets/` - Timesheet management
- `/api/timesheets/current_week/` - Current timesheet
- `/api/timesheets/{id}/submit/` - Submit for approval
- `/api/timesheets/{id}/approve/` - Approve timesheet
- `/api/payroll/process/` - Payroll processing
- `/api/paystubs/` - Pay stub access
- `/api/paystubs/{id}/download/` - PDF download

## Security Features:
- **Row-Level Security (RLS)** for data isolation
- **Session-based authentication** for all API calls
- **Role-based access control** (OWNER/ADMIN/USER)
- **Audit logging** for all payroll actions
- **Data encryption** for sensitive information
- **Compliance** with banking and payroll regulations

## Mobile and PWA Support:
- **Responsive design** for all components
- **Touch-friendly interfaces** for mobile users
- **Offline capability** for timesheet entry
- **Native PDF viewing** for pay stubs
- **Push notifications** for payroll updates
- **Location services** for geofenced clock in/out

## Integration Points:
- **Stripe Connect** for payment processing
- **Banking APIs** for direct deposit
- **Tax calculation services** for compliance
- **Email services** for notifications
- **Accounting software** for financial reporting

This comprehensive payroll system provides an end-to-end solution for businesses to manage their entire payroll workflow, from configuration through final payment, with proper compliance, security, and user experience considerations.