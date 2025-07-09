# SSN/TIN Global Implementation Guide

*Quick reference for implementing secure tax identification number handling*

## Overview

This guide provides the complete implementation for handling Social Security Numbers (SSN), National Insurance Numbers (NIN), Tax Identification Numbers (TIN), and other country-specific tax IDs with secure Stripe storage.

## Key Features

✅ **25+ Country Support** - Automatic label detection  
✅ **Secure Storage** - Full numbers in Stripe, last 4 digits locally  
✅ **Dynamic Forms** - Auto-updating labels based on country  
✅ **Salary/Wage Toggle** - Support for both compensation types  
✅ **Real Database** - No demo data, live API integration  

## Quick Start

### 1. Country Selection
```javascript
// User selects country → Auto-updates tax ID label
'US' → 'Social Security Number' (XXX-XX-XXXX)
'UK' → 'National Insurance Number' (XX 12 34 56 X)
'KE' → 'Tax Identification Number' (Enter TIN)
```

### 2. Security Notice
```javascript
<p className="text-xs text-gray-500">
  🔒 Securely encrypted and stored with Stripe for payroll processing
</p>
```

### 3. Backend Storage
```python
# Employee creation with secure storage
employee = Employee.objects.create(**employee_data)
if security_number:
    employee.save_ssn_to_stripe(security_number)
    # ✅ Full number → Stripe
    # ✅ Last 4 digits → Local DB
    # ✅ Boolean flag → ssn_stored_in_stripe = True
```

## Supported Countries

| Country | Code | Tax ID Type | Label |
|---------|------|-------------|-------|
| 🇺🇸 United States | US | SSN | Social Security Number |
| 🇬🇧 United Kingdom | UK | NIN | National Insurance Number |
| 🇨🇦 Canada | CA | SIN | Social Insurance Number |
| 🇦🇺 Australia | AU | TFN | Tax File Number |
| 🇰🇪 Kenya | KE | OTHER | Tax Identification Number |
| 🇳🇬 Nigeria | NG | OTHER | Tax Identification Number |
| 🇿🇦 South Sudan | SS | OTHER | Tax Identification Number |
| 🇿🇦 South Africa | ZA | OTHER | Tax Identification Number |
| 🇸🇬 Singapore | SG | NRIC | NRIC Number |
| 🇮🇳 India | IN | PAN | PAN Card Number |
| 🇧🇷 Brazil | BR | CPF | CPF Number |
| 🇲🇽 Mexico | MX | CURP | CURP |
| 🇪🇸 Spain | ES | DNI | DNI Number |
| 🇦🇷 Argentina | AR | DNI | DNI Number |
| 🇭🇰 Hong Kong | HK | HKID | Hong Kong ID Card |
| 🇸🇪 Sweden | SE | NINO | Personal Identity Number |
| 🇳🇱 Netherlands | NL | BSN | Citizen Service Number |
| 🇵🇱 Poland | PL | PESEL | PESEL Number |
| 🇨🇱 Chile | CL | RUT | RUT Number |
| 🇵🇰 Pakistan | PK | CNIC | CNIC Number |
| 🇲🇾 Malaysia | MY | MYKAD | MyKad Number |
| 🇮🇩 Indonesia | ID | KTP | KTP Number |
| 🇵🇹 Portugal | PT | NIF | NIF Number |
| 🇳🇿 New Zealand | NZ | IRD | IRD Number |
| 🇮🇪 Ireland | IE | PPS | PPS Number |
| 🇸🇦 Saudi Arabia | SA | IQAMA | Iqama Number |

## API Endpoints

### Base URL
```
https://api.dottapps.com/api/hr/
```

### Employee Operations
```http
GET    /employees/         # List all employees
POST   /employees/         # Create new employee
GET    /employees/stats/   # Get statistics
GET    /employees/{id}/    # Get employee details
PUT    /employees/{id}/    # Update employee
DELETE /employees/{id}/    # Delete employee
```

### Required Headers
```http
Authorization: Session {session_id}
X-Tenant-ID: {tenant_id}
Content-Type: application/json
```

## Implementation Steps

### Step 1: Frontend Form Setup
```javascript
// Country mapping (add to EmployeeManagement.js)
const COUNTRY_TO_SECURITY_NUMBER = {
  'US': { type: 'SSN', label: 'Social Security Number', placeholder: 'XXX-XX-XXXX' },
  'UK': { type: 'NIN', label: 'National Insurance Number', placeholder: 'XX 12 34 56 X' },
  // ... 23 more countries
};

// Form state
const [formData, setFormData] = useState({
  country: 'US',
  securityNumberType: 'SSN',
  securityNumber: '',
  compensationType: 'SALARY'
});
```

### Step 2: Dynamic Field Rendering
```javascript
// Country dropdown with auto-update
<select onChange={(e) => handleCountryChange(e.target.value)}>
  {COUNTRIES.map(country => (
    <option key={country.code} value={country.code}>
      {country.name}
    </option>
  ))}
</select>

// Dynamic tax ID field
<label>{getSecurityNumberInfo(formData.country).label}</label>
<input 
  placeholder={getSecurityNumberInfo(formData.country).placeholder}
  value={formData.securityNumber}
  onChange={(e) => setFormData({...formData, securityNumber: e.target.value})}
/>
```

### Step 3: Backend Integration
```python
# views.py - Employee creation
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def employee_list(request):
    employee_data = request.data.copy()
    security_number = employee_data.pop('securityNumber', None)
    
    # Create employee
    serializer = EmployeeSerializer(data=employee_data)
    if serializer.is_valid():
        employee = serializer.save()
        
        # Secure storage
        if security_number:
            employee.save_ssn_to_stripe(security_number)
```

### Step 4: Security Configuration
```python
# models.py - Secure storage method
def save_ssn_to_stripe(self, ssn):
    """Store SSN securely in Stripe"""
    try:
        # Stripe API integration (existing implementation)
        stripe.Customer.create_source(
            customer_id,
            source={
                "type": "tax_id",
                "tax_id": {
                    "type": self.security_number_type.lower(),
                    "value": ssn
                }
            }
        )
        
        # Store only last 4 digits locally
        self.ssn_last_four = ssn[-4:] if ssn else None
        self.ssn_stored_in_stripe = True
        self.save()
        
    except Exception as e:
        logger.error(f'Stripe storage failed: {str(e)}')
        raise
```

## Security Best Practices

### 1. Data Protection
```python
# ✅ DO: Store full SSN in Stripe
employee.save_ssn_to_stripe(full_ssn)

# ❌ DON'T: Store full SSN in local database
employee.ssn = full_ssn  # Never do this
```

### 2. Logging Security
```python
# ✅ DO: Mask sensitive data in logs
logger.info(f'Employee created: {employee.id}')
logger.info(f'SSN stored: last 4 digits {employee.ssn_last_four}')

# ❌ DON'T: Log full SSN
logger.info(f'SSN: {full_ssn}')  # Security violation
```

### 3. API Response Security
```python
# ✅ DO: Return only last 4 digits
{
  "id": "123...",
  "ssnLastFour": "1234",
  "ssnStoredInStripe": true
}

# ❌ DON'T: Return full SSN
{
  "ssn": "123-45-6789"  # Never expose this
}
```

## Testing Checklist

### Frontend Testing
- [ ] Country selection updates tax ID label
- [ ] Compensation type toggle works (salary/wage)
- [ ] Form validation requires tax ID
- [ ] Security notice displays correctly
- [ ] Error handling shows proper messages

### Backend Testing
- [ ] Employee creation with authentication
- [ ] SSN storage in Stripe succeeds
- [ ] Only last 4 digits stored locally
- [ ] Boolean flags set correctly
- [ ] Stats endpoint returns accurate data

### Integration Testing
- [ ] Full end-to-end employee creation
- [ ] Data persists after page refresh
- [ ] Multi-tenant isolation works
- [ ] Session authentication validates
- [ ] Error scenarios handled gracefully

## Common Issues

### 403 Forbidden Error
```bash
# Check authentication
curl -H "Authorization: Session {session_id}" \
     -H "X-Tenant-ID: {tenant_id}" \
     https://api.dottapps.com/api/hr/employees/
```

### Country Label Not Updating
```javascript
// Verify handleCountryChange is called
const handleCountryChange = (countryCode) => {
  console.log('Country changed to:', countryCode);
  const securityInfo = getSecurityNumberInfo(countryCode);
  console.log('New security info:', securityInfo);
};
```

### Stripe Storage Failing
```python
# Check environment variables
import os
print('STRIPE_SECRET_KEY:', os.getenv('STRIPE_SECRET_KEY')[:10] + '...')

# Test Stripe connection
import stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
customers = stripe.Customer.list(limit=1)
```

## File Locations

### Frontend Files
```
/src/app/dashboard/components/forms/EmployeeManagement.js
/src/utils/apiClient.js
/src/app/api/hr/employees/route.js
/src/app/api/hr/employees/[id]/route.js
/src/app/api/hr/employees/stats/route.js
```

### Backend Files
```
/backend/pyfactor/hr/models.py
/backend/pyfactor/hr/views.py
/backend/pyfactor/hr/urls.py
/backend/pyfactor/hr/serializers.py
```

### Documentation
```
/docs/EMPLOYEE_MANAGEMENT.md (Complete guide)
/docs/TROUBLESHOOTING.md (Issue resolution)
/docs/SSN_TIN_IMPLEMENTATION.md (This file)
```

## Support

For implementation questions:

1. **Documentation**: Check `/docs/EMPLOYEE_MANAGEMENT.md` for complete details
2. **Troubleshooting**: See `/docs/TROUBLESHOOTING.md` for common issues
3. **Security**: Review Stripe integration documentation
4. **API**: Test endpoints with proper authentication headers

---

*Implementation completed: 2025-01-09*  
*Next: Add additional countries as needed*