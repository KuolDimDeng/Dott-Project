# Invoice PDF Generation Implementation

## Overview
I've implemented an invoice PDF generation endpoint in the Django backend that follows the existing patterns and uses the already-installed `reportlab` library.

## Implementation Details

### 1. PDF Generation Function
**File**: `/backend/pyfactor/sales/utils.py`
- Added `generate_invoice_pdf(invoice)` function
- Uses ReportLab to create professional-looking invoice PDFs
- Includes:
  - Invoice header with invoice number, date, and due date
  - Status indicator (color-coded)
  - Business information placeholder
  - Customer billing details
  - Itemized table with descriptions, quantities, unit prices, and totals
  - Financial summary (subtotal, tax, discount, total)
  - Payment information (amount paid, balance due)
  - Notes and terms sections
  - Professional footer

### 2. API Endpoint
**File**: `/backend/pyfactor/sales/viewsets.py`
- Added `pdf` action to `InvoiceViewSet`
- Endpoint: `/api/sales/invoices/{id}/pdf/`
- Method: GET
- Authentication: Required (uses `IsAuthenticated` permission)
- Returns: PDF file with proper headers

### 3. Features
- Tenant-aware: Respects the existing tenant isolation
- Follows session-based authentication pattern
- Handles related data fetching (customer, items, products/services)
- Proper error handling with appropriate HTTP status codes
- Professional PDF layout with:
  - Clean, readable formatting
  - Proper alignment and spacing
  - Color-coded status
  - Table formatting for line items
  - Currency formatting

### 4. Usage
To generate a PDF for an invoice, make a GET request to:
```
GET /api/sales/invoices/{invoice_id}/pdf/
```

The response will be a PDF file that can be:
- Displayed inline in the browser
- Downloaded by the user
- Sent via email (using existing email functionality)

### 5. Testing
A test script is provided at `/backend/pyfactor/test_invoice_pdf.py` to verify the implementation.

## Future Enhancements
1. Fetch actual tenant/business information for the header
2. Add company logo support
3. Add QR codes for payment links
4. Support for multiple currencies and localization
5. Add watermarks for draft invoices
6. Include payment instructions based on payment methods

## Dependencies
- `reportlab==4.2.5` (already installed)
- No additional dependencies required