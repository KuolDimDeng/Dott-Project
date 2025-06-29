# Tax Data Abuse Control API Documentation

## Overview

The Tax Data Abuse Control system provides rate limiting, monitoring, and abuse prevention for tax-related data entry operations. This ensures system stability and prevents malicious or accidental abuse of tax data endpoints.

## API Endpoints

### 1. Tax Data Entry Controls

#### GET /api/taxes/abuse-control/controls/
Get all tax data entry control settings for the current tenant.

**Response:**
```json
[
  {
    "id": "uuid",
    "control_type": "income_tax_rates",
    "max_entries_per_hour": 100,
    "max_entries_per_day": 1000,
    "max_entries_per_month": 10000,
    "is_active": true,
    "created_at": "2025-06-29T00:00:00Z",
    "updated_at": "2025-06-29T00:00:00Z"
  }
]
```

#### POST /api/taxes/abuse-control/controls/
Create a new control setting.

**Request Body:**
```json
{
  "control_type": "income_tax_rates",
  "max_entries_per_hour": 100,
  "max_entries_per_day": 1000,
  "max_entries_per_month": 10000,
  "is_active": true
}
```

#### GET /api/taxes/abuse-control/controls/summary/
Get a summary of all control settings.

### 2. Tax Data Entry Logs

#### GET /api/taxes/abuse-control/logs/
View tax data entry logs with optional filtering.

**Query Parameters:**
- `control_type`: Filter by control type
- `status`: Filter by status (allowed, rate_limited, blocked, suspicious)
- `user_id`: Filter by user ID
- `from_date`: Filter logs from this date
- `to_date`: Filter logs until this date

**Response:**
```json
[
  {
    "id": "uuid",
    "control_type": "income_tax_rates",
    "entry_type": "create",
    "user": "user_id",
    "user_email": "user@example.com",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "status": "allowed",
    "entry_count": 1,
    "details": {},
    "created_at": "2025-06-29T00:00:00Z"
  }
]
```

#### GET /api/taxes/abuse-control/logs/statistics/
Get statistics on tax data entries.

**Response:**
```json
{
  "total_entries": 1000,
  "by_status": [
    {"status": "allowed", "count": 950},
    {"status": "rate_limited", "count": 40},
    {"status": "blocked", "count": 10}
  ],
  "by_control_type": [
    {
      "control_type": "income_tax_rates",
      "count": 500,
      "total_entries": 600
    }
  ],
  "by_user": [
    {"user__email": "user@example.com", "count": 100}
  ]
}
```

### 3. Abuse Reports

#### GET /api/taxes/abuse-control/reports/
Get all abuse reports.

**Response:**
```json
[
  {
    "id": "uuid",
    "report_type": "Excessive API calls",
    "severity": "high",
    "status": "pending",
    "user": "user_id",
    "user_email": "user@example.com",
    "description": "Automated report: Excessive API calls",
    "evidence": {"call_count": 1000},
    "action_taken": "",
    "created_at": "2025-06-29T00:00:00Z",
    "updated_at": "2025-06-29T00:00:00Z",
    "resolved_at": null,
    "resolved_by": null,
    "resolved_by_email": null
  }
]
```

#### POST /api/taxes/abuse-control/reports/{id}/resolve/
Resolve an abuse report.

**Request Body:**
```json
{
  "action_taken": "User warned and rate limits reduced",
  "status": "resolved"
}
```

#### GET /api/taxes/abuse-control/reports/pending/
Get all pending abuse reports.

### 4. Blacklist Management

#### GET /api/taxes/abuse-control/blacklist/
Get blacklist entries.

**Query Parameters:**
- `is_active`: Filter by active status (true/false)
- `blacklist_type`: Filter by type (user, tenant, ip)

**Response:**
```json
[
  {
    "id": "uuid",
    "blacklist_type": "user",
    "identifier": "user_id",
    "reason": "Repeated rate limit violations",
    "is_active": true,
    "created_at": "2025-06-29T00:00:00Z",
    "expires_at": "2025-07-29T00:00:00Z",
    "created_by": "admin_user_id",
    "created_by_email": "admin@example.com"
  }
]
```

#### POST /api/taxes/abuse-control/blacklist/
Add a new blacklist entry.

**Request Body:**
```json
{
  "blacklist_type": "user",
  "identifier": "user_id",
  "reason": "Repeated rate limit violations",
  "expires_at": "2025-07-29T00:00:00Z"
}
```

#### POST /api/taxes/abuse-control/blacklist/{id}/deactivate/
Deactivate a blacklist entry.

#### POST /api/taxes/abuse-control/blacklist/check/
Check if an identifier is blacklisted.

**Request Body:**
```json
{
  "blacklist_type": "user",
  "identifier": "user_id"
}
```

**Response:**
```json
{
  "is_blacklisted": true
}
```

## Rate Limiting

When rate limits are exceeded, the API will return:

**Status Code:** 429 Too Many Requests

**Response:**
```json
{
  "error": "Hourly rate limit exceeded (100 entries/hour)"
}
```

## Control Types

The following control types are available:
- `income_tax_rates`: Income tax rate entries
- `payroll_filings`: Payroll tax filing entries  
- `tax_forms`: Tax form uploads
- `api_calls`: External tax API calls

## Default Limits

Default rate limits (can be customized per tenant):
- **Hourly**: 100 entries
- **Daily**: 1,000 entries
- **Monthly**: 10,000 entries

## Security Features

1. **Automatic Blacklisting**: Users/IPs are automatically blacklisted after repeated violations
2. **Suspicious Activity Detection**: Detects patterns like:
   - Rapid fire requests (>10 requests/minute)
   - Multiple IPs per user (>5 IPs/hour)
   - Excessive failed attempts (>20/hour)
3. **Tenant Isolation**: All controls and logs are isolated per tenant
4. **Audit Trail**: Complete logging of all tax data operations

## Integration with Tax Endpoints

The abuse control system is automatically integrated with:
- `/api/taxes/tax-rates/` (Income tax rates)
- `/api/taxes/tax-filings/` (Payroll tax filings)
- `/api/taxes/tax-forms/` (Tax form uploads)

All POST, PUT, PATCH, and DELETE operations on these endpoints are subject to abuse control checks.

## Management Commands

Set up initial controls for all tenants:
```bash
python manage.py setup_tax_abuse_controls
```

Set up controls for a specific tenant with custom limits:
```bash
python manage.py setup_tax_abuse_controls --tenant-id=UUID --hourly-limit=50 --daily-limit=500 --monthly-limit=5000
```