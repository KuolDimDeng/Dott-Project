# POS System Implementation - Production Ready

A comprehensive Point of Sale (POS) system built with Django REST Framework that rivals Square/Shopify POS systems. This implementation provides bank-grade transaction processing with real-time inventory management and automatic double-entry bookkeeping.

## 🚀 Features

### Core POS Functionality
- ✅ **Complete Sale Processing** - Single endpoint handles entire transaction flow
- ✅ **Multi-Item Transactions** - Support for products and services in same transaction
- ✅ **Multiple Payment Methods** - Cash, card, mobile money, bank transfer, check, store credit
- ✅ **Real-time Change Calculation** - Automatic change calculation for cash transactions
- ✅ **Transaction Numbering** - Auto-generated unique transaction numbers (POS-YYYYMM-NNNN)

### Inventory Management
- ✅ **Real-time Stock Validation** - Pre-sale stock availability checking
- ✅ **Atomic Stock Reduction** - Database-locked stock updates to prevent overselling
- ✅ **Stock Restoration** - Automatic stock restoration for voids and refunds
- ✅ **Low Stock Alerts** - Automatic alerts when products reach reorder levels
- ✅ **Historical Stock Tracking** - Complete audit trail of stock movements

### Accounting Integration
- ✅ **Double-Entry Bookkeeping** - Automatic journal entries following GAAP standards
- ✅ **Account Mapping** - Intelligent account selection and creation
- ✅ **Tax Handling** - Automatic sales tax calculations and payable tracking
- ✅ **Cost of Goods Sold** - Automatic COGS tracking for products
- ✅ **Void Reversals** - Proper accounting reversals for voided transactions

### Business Operations
- ✅ **Customer Management** - Optional customer association with transactions
- ✅ **Discount Support** - Percentage-based discounts with proper accounting
- ✅ **Tax Configuration** - Flexible tax rate application
- ✅ **Refund Processing** - Full and partial refunds with inventory restoration
- ✅ **Transaction Voiding** - Complete transaction reversal with audit trail

### Security & Compliance
- ✅ **Tenant Isolation** - Complete data separation between businesses
- ✅ **User Authentication** - Session-based authentication required
- ✅ **Audit Trail** - Complete logging of all operations with user tracking
- ✅ **Data Validation** - Comprehensive input validation and sanitization
- ✅ **Error Handling** - Detailed error responses with recovery guidance

### Reporting & Analytics
- ✅ **Daily Sales Summary** - Real-time daily metrics and breakdowns
- ✅ **Payment Method Analysis** - Transaction counts and totals by payment method
- ✅ **Transaction History** - Paginated transaction listings with filtering
- ✅ **Low Stock Reports** - Automated reorder alerts and inventory insights

## 🏗️ Architecture

### Models
- **POSTransaction** - Main transaction record with totals, payment info, and metadata
- **POSTransactionItem** - Individual line items with product/service details
- **POSRefund** - Refund records with approval workflow
- **POSRefundItem** - Individual refund line items

### Services
- **InventoryService** - Handles all stock operations and validations
- **AccountingService** - Manages journal entries and account operations

### API Structure
```
/api/sales/pos/
├── transactions/
│   ├── complete-sale/     # POST - Main sale endpoint
│   ├── {id}/void/         # POST - Void transaction
│   ├── daily-summary/     # GET - Daily metrics
│   ├── list/             # GET - Transaction listing
│   └── {id}/             # GET - Transaction details
└── refunds/
    ├── create/           # POST - Create refund
    └── list/             # GET - Refund listing
```

## 📋 Installation & Setup

### 1. Add to Django Settings

```python
# settings.py
INSTALLED_APPS = [
    # ... existing apps
    'sales',
    'inventory',
    'finance',
    'crm',
]

# Optional: Custom exception handler for POS errors
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'sales.exceptions.custom_exception_handler',
    # ... other settings
}
```

### 2. Run Migrations

```bash
# Create and apply migrations
python manage.py makemigrations sales
python manage.py migrate
```

### 3. Update URLs

```python
# urls.py
urlpatterns = [
    # ... existing patterns
    path('api/sales/', include('sales.urls')),
]
```

### 4. Set Up Accounts (One-time)

The system will automatically create required accounting accounts, but you can pre-create them:

```python
# In Django shell or management command
from sales.services.accounting_service import AccountingService

# Validate and create required accounts
validation_result = AccountingService.validate_accounts_exist()
print("Account validation:", validation_result)
```

## 🔧 Usage Examples

### Complete a Sale

```python
# POST /api/sales/pos/transactions/complete-sale/
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",  # Optional
  "items": [
    {
      "id": "product-uuid",
      "type": "product",
      "quantity": 2,
      "unit_price": 15.99  # Optional - uses default if not provided
    }
  ],
  "payment_method": "cash",
  "amount_tendered": 50.00,
  "discount_percentage": 5.0,  # Optional
  "tax_rate": 8.5,  # Optional
  "notes": "Customer receipt requested"  # Optional
}
```

### Response Structure

```python
{
  "transaction": {
    "id": "transaction-uuid",
    "transaction_number": "POS-202506-0001",
    "total_amount": "30.38",
    "change_due": "19.62",
    "status": "completed"
    # ... more fields
  },
  "inventory_updates": {
    "product-uuid": {
      "old_quantity": 50,
      "new_quantity": 48,
      "quantity_reduced": 2
    }
  },
  "low_stock_alerts": [],  # Products below reorder level
  "accounting": {
    "journal_entry_id": "journal-uuid",
    "status": "posted"
  }
}
```

### Void a Transaction

```python
# POST /api/sales/pos/transactions/{id}/void/
{
  "reason": "Customer requested cancellation"
}
```

### Create a Refund

```python
# POST /api/sales/pos/refunds/
{
  "original_transaction": "transaction-uuid",
  "refund_type": "partial",
  "total_amount": "15.99",
  "reason": "Product defective",
  "items": [
    {
      "original_item": "item-uuid",
      "quantity_returned": 1,
      "unit_refund_amount": "15.99",
      "condition": "defective"
    }
  ]
}
```

## 🔍 Error Handling

The system provides detailed error responses:

### Insufficient Stock
```python
{
  "error": {
    "type": "InsufficientStockException",
    "message": "Insufficient stock for one or more products",
    "details": {
      "stock_errors": [
        {
          "product_id": "uuid",
          "product_name": "Coffee Beans",
          "available": 1,
          "requested": 2
        }
      ]
    }
  }
}
```

### Payment Validation
```python
{
  "error": {
    "type": "PaymentValidationException",
    "message": "Insufficient cash tendered",
    "details": {
      "amount_tendered": "20.00",
      "total_amount": "25.99",
      "shortage": "5.99"
    }
  }
}
```

## 📊 Accounting Details

### Sale Transaction Journal Entry
```
Date: 2025-06-27
Reference: POS-202506-0001
Description: POS Sale - POS-202506-0001

Debit:  Cash                    $50.00
Credit: Sales Revenue           $46.30
Credit: Sales Tax Payable       $3.70
Debit:  Cost of Goods Sold     $25.00
Credit: Inventory               $25.00
```

### Refund Transaction Journal Entry
```
Date: 2025-06-27
Reference: REF-202506-0001
Description: POS Refund - REF-202506-0001

Credit: Cash                    $15.99
Debit:  Sales Revenue           $14.81
Debit:  Sales Tax Payable       $1.18
Credit: Cost of Goods Sold      $8.00
Debit:  Inventory               $8.00
```

## 🔒 Security Features

### Tenant Isolation
- All models extend `TenantAwareModel`
- Automatic tenant filtering on all queries
- Tenant ID validation on all operations

### Data Validation
- Comprehensive input sanitization
- Stock availability pre-validation
- Payment amount validation
- Business rule enforcement

### Audit Trail
- Complete transaction history
- User tracking for all operations
- Timestamp tracking for all changes
- Void reason tracking

## 📈 Performance Optimizations

### Database
- Optimized indexes for common query patterns
- Atomic transactions for consistency
- Select-for-update locks for stock operations
- Efficient prefetching for related objects

### Caching
- Product data caching where appropriate
- Account lookup optimization
- Minimal database queries per operation

### Scalability
- Pagination for all list endpoints
- Efficient bulk operations
- Optimized serializers for performance

## 🧪 Testing

### Test Coverage
- Unit tests for all service classes
- Integration tests for API endpoints
- Error handling validation
- Multi-tenant isolation tests
- Performance benchmarks

### Running Tests
```bash
# Run all POS tests
python manage.py test sales.tests.test_pos

# Run specific test categories
python manage.py test sales.tests.test_inventory_service
python manage.py test sales.tests.test_accounting_service
python manage.py test sales.tests.test_pos_viewsets
```

## 🚀 Deployment

### Requirements
- Django 4.0+
- PostgreSQL (recommended for production)
- Redis (optional, for caching)

### Production Checklist
- [ ] Run migrations: `python manage.py migrate`
- [ ] Create accounting accounts: `python manage.py shell < create_accounts.py`
- [ ] Set up proper logging configuration
- [ ] Configure backup strategies for transaction data
- [ ] Set up monitoring for low stock alerts
- [ ] Configure payment processor integrations (if needed)
- [ ] Test transaction flows end-to-end
- [ ] Verify tenant isolation in multi-tenant environments

### Monitoring
- Monitor transaction volumes and patterns
- Track inventory levels and alerts
- Monitor accounting journal entry accuracy
- Set up alerts for system errors
- Track performance metrics

## 🔧 Customization

### Adding Payment Methods
```python
# In models.py
PAYMENT_METHOD_CHOICES = [
    ('cash', 'Cash'),
    ('card', 'Credit/Debit Card'),
    ('mobile_money', 'Mobile Money'),
    ('bank_transfer', 'Bank Transfer'),
    ('check', 'Check'),
    ('store_credit', 'Store Credit'),
    ('custom_method', 'Custom Payment'),  # Add new method
]
```

### Custom Accounting Rules
```python
# In accounting_service.py
class CustomAccountingService(AccountingService):
    @staticmethod
    def create_sale_journal_entry(pos_transaction, items_data):
        # Custom accounting logic
        pass
```

### Additional Validation Rules
```python
# In services/inventory_service.py
class CustomInventoryService(InventoryService):
    @staticmethod
    def validate_stock_availability(items):
        # Custom validation logic
        super().validate_stock_availability(items)
        # Additional custom validations
```

## 📞 Support & Maintenance

### Monitoring Points
- Transaction completion rates
- Error frequency and types
- Inventory accuracy
- Accounting entry integrity
- Performance metrics

### Common Issues
- **Stock Synchronization** - Use atomic operations and locks
- **Accounting Mismatches** - Verify account mappings and journal entry logic
- **Performance Degradation** - Monitor query efficiency and add indexes as needed
- **Data Integrity** - Regular data validation and backup verification

### Troubleshooting
1. Check application logs for detailed error information
2. Verify database constraints and foreign key relationships
3. Validate tenant isolation and data access patterns
4. Review transaction atomicity and rollback behavior
5. Monitor system resources and database performance

This POS system implementation provides enterprise-grade functionality suitable for retail businesses of all sizes, with the scalability and security needed for production deployment.