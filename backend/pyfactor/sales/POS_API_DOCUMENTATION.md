# POS System API Documentation

This document describes the comprehensive Point of Sale (POS) system API endpoints that handle sales transactions, inventory management, and accounting operations.

## Overview

The POS system provides bank-grade transaction processing with:
- ✅ **Real-time inventory management** - Automatic stock reduction and validation
- ✅ **Double-entry bookkeeping** - Automatic journal entries following accounting standards
- ✅ **Multi-payment support** - Cash, card, mobile money, bank transfer, check, store credit
- ✅ **Comprehensive validation** - Stock availability, payment validation, business logic
- ✅ **Tenant isolation** - Complete data security with tenant-aware operations
- ✅ **Error handling** - Detailed error responses with recovery suggestions
- ✅ **Audit trail** - Complete transaction history and logging

## Base URL

```
/api/sales/pos/
```

## Authentication

All endpoints require authentication using the existing session-based authentication system.

## Core Endpoints

### 1. Complete Sale Transaction

**POST** `/api/sales/pos/transactions/complete-sale/`

The main endpoint for processing POS sales. Handles everything in a single atomic transaction:
- Transaction creation
- Inventory reduction
- Automatic journal entries
- Low stock alerts

#### Request Body

```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",  // Optional
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "type": "product",  // or "service"
      "quantity": 2,
      "unit_price": 15.99  // Optional - uses item's default price if not provided
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "type": "service",
      "quantity": 1,
      "unit_price": 50.00
    }
  ],
  "payment_method": "cash",  // cash|card|mobile_money|bank_transfer|check|store_credit
  "amount_tendered": 100.00,  // Required for cash payments
  "discount_percentage": 5.0,  // Optional
  "tax_rate": 8.5,  // Optional
  "notes": "Customer requested receipt via email"  // Optional
}
```

#### Response (201 Created)

```json
{
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "transaction_number": "POS-202506-0001",
    "subtotal": "81.98",
    "discount_amount": "4.10",
    "tax_total": "6.67",
    "total_amount": "84.55",
    "payment_method": "cash",
    "amount_tendered": "100.00",
    "change_due": "15.45",
    "status": "completed",
    "created_at": "2025-06-27T14:30:00Z",
    "customer_name": "John Doe"
  },
  "items": [
    {
      "name": "Premium Coffee Beans",
      "sku": "PROD-2025-0001",
      "quantity": "2",
      "unit_price": "15.99",
      "line_total": "31.98",
      "tax_amount": "2.74"
    },
    {
      "name": "Barista Training Service",
      "sku": "SERV-2025-0001",
      "quantity": "1",
      "unit_price": "50.00",
      "line_total": "50.00",
      "tax_amount": "3.93"
    }
  ],
  "inventory_updates": {
    "550e8400-e29b-41d4-a716-446655440001": {
      "product_name": "Premium Coffee Beans",
      "old_quantity": 50,
      "new_quantity": 48,
      "quantity_reduced": 2
    }
  },
  "low_stock_alerts": [],
  "accounting": {
    "journal_entry_id": "550e8400-e29b-41d4-a716-446655440004",
    "status": "posted"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation Error
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": {
      "validation_errors": ["Item quantity must be greater than 0"]
    }
  }
}
```

**409 Conflict** - Insufficient Stock
```json
{
  "error": {
    "type": "InsufficientStockException",
    "message": "Insufficient stock for one or more products",
    "details": {
      "stock_errors": [
        {
          "product_id": "550e8400-e29b-41d4-a716-446655440001",
          "product_name": "Premium Coffee Beans",
          "available": 1,
          "requested": 2
        }
      ]
    }
  }
}
```

### 2. List Transactions

**GET** `/api/sales/pos/transactions/`

Retrieve paginated list of POS transactions.

#### Query Parameters

- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 20, max: 100)
- `status` - Filter by status: completed|voided|refunded|partial_refund
- `payment_method` - Filter by payment method
- `customer_id` - Filter by customer
- `date_from` - Filter from date (YYYY-MM-DD)
- `date_to` - Filter to date (YYYY-MM-DD)

#### Response (200 OK)

```json
{
  "count": 1250,
  "next": "http://api.example.com/api/sales/pos/transactions/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "transaction_number": "POS-202506-0001",
      "customer_name": "John Doe",
      "total_amount": "84.55",
      "payment_method": "cash",
      "status": "completed",
      "total_items_count": 3,
      "created_at": "2025-06-27T14:30:00Z"
    }
  ]
}
```

### 3. Get Transaction Details

**GET** `/api/sales/pos/transactions/{id}/`

Retrieve detailed information about a specific transaction.

#### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "transaction_number": "POS-202506-0001",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "subtotal": "81.98",
  "discount_amount": "4.10",
  "discount_percentage": "5.00",
  "tax_total": "6.67",
  "total_amount": "84.55",
  "payment_method": "cash",
  "amount_tendered": "100.00",
  "change_due": "15.45",
  "status": "completed",
  "notes": "Customer requested receipt via email",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "product_name": "Premium Coffee Beans",
      "service_name": null,
      "item_name": "Premium Coffee Beans",
      "item_sku": "PROD-2025-0001",
      "quantity": "2.000",
      "unit_price": "15.99",
      "line_discount": "1.60",
      "line_discount_percentage": "5.00",
      "tax_rate": "8.50",
      "tax_amount": "2.74",
      "tax_inclusive": false,
      "line_total": "31.98",
      "cost_price": "8.00"
    }
  ],
  "created_at": "2025-06-27T14:30:00Z",
  "created_by_name": "cashier1"
}
```

### 4. Void Transaction

**POST** `/api/sales/pos/transactions/{id}/void/`

Void a completed transaction. This will:
- Restore inventory for products
- Create reverse accounting entries
- Update transaction status to 'voided'

#### Request Body

```json
{
  "reason": "Customer changed mind"
}
```

#### Response (200 OK)

```json
{
  "message": "Transaction POS-202506-0001 has been voided",
  "voided_transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "transaction_number": "POS-202506-0001",
    "status": "voided",
    "void_reason": "Customer changed mind",
    "voided_at": "2025-06-27T15:00:00Z",
    "voided_by": "manager1"
  },
  "inventory_restored": {
    "550e8400-e29b-41d4-a716-446655440001": {
      "product_name": "Premium Coffee Beans",
      "old_quantity": 48,
      "new_quantity": 50,
      "quantity_restored": 2
    }
  },
  "void_journal_entry_id": "550e8400-e29b-41d4-a716-446655440006"
}
```

### 5. Daily Sales Summary

**GET** `/api/sales/pos/transactions/daily-summary/`

Get sales summary for the current day.

#### Response (200 OK)

```json
{
  "date": "2025-06-27",
  "summary": {
    "total_sales": "2456.78",
    "total_transactions": 34,
    "total_items_sold": 127,
    "average_transaction": "72.26"
  },
  "payment_methods": {
    "cash": {
      "count": 18,
      "total": "1234.56"
    },
    "card": {
      "count": 14,
      "total": "987.65"
    },
    "mobile_money": {
      "count": 2,
      "total": "234.57"
    }
  }
}
```

## Refund Endpoints

### 1. Create Refund

**POST** `/api/sales/pos/refunds/`

Create a refund for items from a previous transaction.

#### Request Body

```json
{
  "original_transaction": "550e8400-e29b-41d4-a716-446655440003",
  "refund_type": "partial",  // full|partial|exchange
  "total_amount": "31.98",
  "tax_amount": "2.74",
  "reason": "Product was damaged",
  "notes": "Customer will exchange for different size",
  "items": [
    {
      "original_item": "550e8400-e29b-41d4-a716-446655440005",
      "quantity_returned": "2.000",
      "unit_refund_amount": "15.99",
      "condition": "damaged"
    }
  ]
}
```

#### Response (201 Created)

```json
{
  "refund": {
    "id": "550e8400-e29b-41d4-a716-446655440007",
    "refund_number": "REF-202506-0001",
    "total_amount": "31.98",
    "status": "pending",
    "created_at": "2025-06-27T15:30:00Z"
  },
  "inventory_restored": {
    "550e8400-e29b-41d4-a716-446655440001": {
      "product_name": "Premium Coffee Beans",
      "old_quantity": 48,
      "new_quantity": 50,
      "quantity_restored": 2
    }
  },
  "journal_entry_id": "550e8400-e29b-41d4-a716-446655440008"
}
```

### 2. List Refunds

**GET** `/api/sales/pos/refunds/`

Retrieve paginated list of refunds.

#### Response (200 OK)

```json
{
  "count": 45,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440007",
      "refund_number": "REF-202506-0001",
      "original_transaction_number": "POS-202506-0001",
      "refund_type": "partial",
      "total_amount": "31.98",
      "status": "pending",
      "created_at": "2025-06-27T15:30:00Z"
    }
  ]
}
```

## Business Logic

### Inventory Management

1. **Stock Validation**: Before processing any sale, the system validates that sufficient stock is available for all products
2. **Atomic Reduction**: Stock is reduced atomically using database locks to prevent race conditions
3. **Stock Restoration**: When transactions are voided or refunds are processed, stock is automatically restored
4. **Low Stock Alerts**: The system automatically identifies products that fall below their reorder level

### Accounting Integration

The system automatically creates double-entry journal entries for all transactions:

#### Sale Transaction Journal Entry
```
Debit:  Cash/Accounts Receivable    $84.55
Credit: Sales Revenue               $77.88
Credit: Sales Tax Payable           $6.67
Debit:  Cost of Goods Sold         $16.00
Credit: Inventory                   $16.00
```

#### Refund Transaction Journal Entry
```
Credit: Cash/Accounts Receivable    $31.98
Debit:  Sales Revenue               $29.24
Debit:  Sales Tax Payable           $2.74
Credit: Cost of Goods Sold          $8.00
Debit:  Inventory                   $8.00
```

### Payment Methods

- **Cash**: Requires `amount_tendered`, calculates change
- **Card**: Processed as exact amount
- **Mobile Money**: Integration ready for payment processors
- **Bank Transfer**: For business-to-business transactions
- **Check**: With check number tracking
- **Store Credit**: For returns and exchanges

### Error Handling

The system provides detailed error responses with specific error codes:

- `INSUFFICIENT_STOCK`: When requested quantity exceeds available stock
- `PRODUCT_NOT_FOUND`: When referenced product doesn't exist
- `INVALID_PAYMENT_METHOD`: When payment validation fails
- `TRANSACTION_ALREADY_VOIDED`: When trying to void an already voided transaction

## Security Features

1. **Tenant Isolation**: All operations are automatically filtered by tenant
2. **User Authentication**: All endpoints require valid authentication
3. **Audit Trail**: Complete logging of all operations with user tracking
4. **Data Validation**: Comprehensive input validation and sanitization
5. **Rate Limiting**: Protection against abuse (inherited from system)

## Performance Considerations

1. **Database Indexing**: Optimized indexes for common query patterns
2. **Atomic Transactions**: All operations use database transactions for consistency
3. **Efficient Queries**: Minimized N+1 queries with proper prefetching
4. **Pagination**: All list endpoints support pagination
5. **Caching**: Product and customer data caching where appropriate

## Integration Examples

### Frontend Integration Example

```javascript
// Complete a sale
const completeSale = async (saleData) => {
  try {
    const response = await fetch('/api/sales/pos/transactions/complete-sale/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      credentials: 'include',
      body: JSON.stringify(saleData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    const result = await response.json();
    
    // Handle success
    console.log('Sale completed:', result.transaction.transaction_number);
    
    // Show low stock alerts if any
    if (result.low_stock_alerts.length > 0) {
      showLowStockAlert(result.low_stock_alerts);
    }
    
    return result;
    
  } catch (error) {
    console.error('Sale failed:', error.message);
    throw error;
  }
};
```

### Error Handling Example

```javascript
try {
  await completeSale(saleData);
} catch (error) {
  if (error.message.includes('Insufficient stock')) {
    // Handle stock shortage
    showStockShortageDialog(error.details.stock_errors);
  } else if (error.message.includes('Payment validation')) {
    // Handle payment issues
    showPaymentErrorDialog(error.details);
  } else {
    // Handle general errors
    showErrorMessage(error.message);
  }
}
```

## Testing

The system includes comprehensive test coverage for:
- ✅ Transaction creation and validation
- ✅ Inventory management operations
- ✅ Accounting journal entry creation
- ✅ Error handling scenarios
- ✅ Multi-tenant data isolation
- ✅ Payment processing validation

## Support

For issues or questions about the POS API:
1. Check the error response details for specific guidance
2. Review the transaction logs for debugging information
3. Verify inventory levels if stock-related errors occur
4. Ensure proper authentication and tenant context