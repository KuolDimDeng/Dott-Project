# Employee Management System Documentation

*Last Updated: 2025-01-09*

## Overview

The Employee Management System provides comprehensive HR functionality with global support for tax identification numbers (SSN, NIN, TIN) and secure storage integration with Stripe for payroll processing.

## Table of Contents

1. [Features](#features)
2. [Security Architecture](#security-architecture)
3. [Global Tax ID Support](#global-tax-id-support)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Database Schema](#database-schema)
7. [Implementation Guide](#implementation-guide)
8. [Troubleshooting](#troubleshooting)

---

## Features

### Core Functionality
- ✅ **CRUD Operations**: Create, Read, Update, Delete employees
- ✅ **Compensation Types**: Salary (annual) or Wage (hourly) support
- ✅ **Global Tax ID**: 25+ countries with proper labeling
- ✅ **Secure Storage**: SSN/TIN data encrypted in Stripe
- ✅ **Real-time Stats**: Dashboard statistics and metrics
- ✅ **Authentication**: Session-based security with tenant isolation

### Employee Data Fields
```javascript
{
  // Personal Information
  firstName: String (required)
  lastName: String (required)
  email: String (required, unique)
  phone: String
  
  // Employment Details
  position: String (required)
  department: String (required)
  hireDate: Date
  status: Enum ['active', 'onLeave', 'inactive']
  
  // Compensation
  compensationType: Enum ['SALARY', 'WAGE']
  salary: Decimal (if SALARY)
  wagePerHour: Decimal (if WAGE)
  
  // Tax Information (Secure)
  country: String (ISO code)
  securityNumberType: String (auto-detected)
  securityNumber: String (stored in Stripe)
  
  // Emergency Contact
  emergencyContact: String
  emergencyPhone: String
}
```

---

## Security Architecture

### SSN/TIN Storage Strategy

```mermaid
graph TD
    A[User Enters SSN/TIN] --> B[Frontend Form]
    B --> C[API Validation]
    C --> D[Employee Created]
    D --> E[save_ssn_to_stripe()]
    E --> F[Stripe Secure Storage]
    E --> G[Local: Last 4 Digits Only]
    
    F --> H[Full Number in Stripe]
    G --> I[Database: XXX-XX-1234]
```

### Security Features

1. **Stripe Integration**
   - Full SSN/TIN stored in Stripe (PCI Level 1 compliant)
   - Only last 4 digits stored locally
   - Boolean flags track storage status

2. **Access Control**
   - Session-based authentication required
   - Tenant isolation via RLS (Row-Level Security)
   - Permission-based access control

3. **Data Protection**
   - AES-256-CBC session encryption
   - HTTPS/TLS in transit
   - CSP headers without unsafe-inline

---

## Global Tax ID Support

### Country Mapping System

```javascript
const COUNTRY_TO_SECURITY_NUMBER = {
  // North America
  'US': { type: 'SSN', label: 'Social Security Number', placeholder: 'XXX-XX-XXXX' },
  'CA': { type: 'SIN', label: 'Social Insurance Number', placeholder: 'XXX-XXX-XXX' },
  
  // Europe
  'UK': { type: 'NIN', label: 'National Insurance Number', placeholder: 'XX 12 34 56 X' },
  'SE': { type: 'NINO', label: 'Personal Identity Number', placeholder: 'YYYYMMDD-XXXX' },
  'NL': { type: 'BSN', label: 'Citizen Service Number', placeholder: '123456789' },
  
  // Africa
  'KE': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN' },
  'NG': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN' },
  'SS': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN' },
  'ZA': { type: 'OTHER', label: 'Tax Identification Number', placeholder: 'Enter TIN' },
  
  // Asia Pacific
  'AU': { type: 'TFN', label: 'Tax File Number', placeholder: 'XXX XXX XXX' },
  'SG': { type: 'NRIC', label: 'NRIC Number', placeholder: 'SXXXXXXXA' },
  'IN': { type: 'PAN', label: 'PAN Card Number', placeholder: 'ABCDE1234F' },
  
  // Other regions...
};
```

### Supported Countries (25+)

| Region | Countries | Tax ID Type |
|--------|-----------|-------------|
| **North America** | US, Canada, Mexico | SSN, SIN, CURP |
| **Europe** | UK, Sweden, Netherlands, Poland, Spain, Portugal, Ireland | NIN, NINO, BSN, PESEL, DNI, NIF, PPS |
| **Africa** | Kenya, Nigeria, South Sudan, South Africa | TIN (Tax Identification Number) |
| **Asia Pacific** | Australia, Singapore, India, Malaysia, Indonesia, Hong Kong | TFN, NRIC, PAN, MyKad, KTP, HKID |
| **South America** | Brazil, Chile, Argentina | CPF, RUT, DNI |
| **Middle East** | Saudi Arabia | Iqama Number |

---

## API Endpoints

### Base URL
```
https://api.dottapps.com/api/hr/
```

### Employee Endpoints

#### 1. List/Create Employees
```http
GET /employees/
POST /employees/
```

**Authentication**: Required (Session token)

**GET Response**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@company.com",
    "position": "Software Engineer",
    "department": "Engineering",
    "compensationType": "SALARY",
    "salary": "75000.00",
    "country": "US",
    "securityNumberType": "SSN",
    "ssnLastFour": "1234",
    "ssnStoredInStripe": true,
    "status": "active",
    "hireDate": "2023-01-15"
  }
]
```

**POST Request**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",
  "position": "Product Manager",
  "department": "Product",
  "compensationType": "SALARY",
  "salary": "85000",
  "country": "UK",
  "securityNumber": "AB123456C",
  "hireDate": "2024-01-09"
}
```

#### 2. Employee Details
```http
GET /employees/{id}/
PUT /employees/{id}/
DELETE /employees/{id}/
```

#### 3. Employee Statistics
```http
GET /employees/stats/
```

**Response**:
```json
{
  "total": 25,
  "active": 22,
  "onLeave": 2,
  "inactive": 1,
  "newThisMonth": 3,
  "departments": 5
}
```

### Headers Required
```http
Authorization: Session {session_id}
X-Tenant-ID: {tenant_id}
Content-Type: application/json
```

---

## Frontend Components

### Main Component
```javascript
// Path: /src/app/dashboard/components/forms/EmployeeManagement.js
function EmployeeManagement({ onNavigate }) {
  // State management with compensation type toggle
  const [formData, setFormData] = useState({
    compensationType: 'SALARY', // or 'WAGE'
    country: 'US', // Auto-detects tax ID type
    securityNumber: '', // Securely stored
    // ... other fields
  });
}
```

### Key Features

1. **Dynamic Tax ID Fields**
   - Country selection auto-updates label
   - Placeholder text shows format examples
   - Validation ensures required completion

2. **Compensation Type Toggle**
   ```javascript
   // Radio button selection
   <input type="radio" value="SALARY" />
   <input type="radio" value="WAGE" />
   
   // Conditional field rendering
   {formData.compensationType === 'SALARY' ? (
     <SalaryInput />
   ) : (
     <WageInput />
   )}
   ```

3. **Security Notice**
   ```javascript
   <p className="text-xs text-gray-500 mt-1">
     🔒 Securely encrypted and stored with Stripe for payroll processing
   </p>
   ```

### API Integration
```javascript
// Path: /src/utils/apiClient.js
export const hrApi = {
  employees: {
    async getAll() {
      // Includes tenant headers automatically
      const tenantId = window.location.pathname.split('/')[1];
      return fetch('/api/hr/employees', {
        headers: {
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
    },
    
    async create(data) {
      // Handles secure SSN/TIN transmission
      return fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'X-Tenant-ID': tenantId },
        body: JSON.stringify(data)
      });
    }
  }
};
```

---

## Database Schema

### Employee Model
```python
# Path: /backend/pyfactor/hr/models.py
class Employee(AbstractUser):
    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = PhoneNumberField(null=True, blank=True)
    
    # Employment Details
    position = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    date_joined = models.DateField(default=timezone.now)
    active = models.BooleanField(default=True)
    
    # Compensation
    compensation_type = models.CharField(
        max_length=10, 
        choices=COMPENSATION_TYPE_CHOICES, 
        default='SALARY'
    )
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wage_per_hour = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    # Tax Information (Secure)
    country = models.CharField(max_length=100, default='USA')
    security_number_type = models.CharField(
        max_length=10, 
        choices=SECURITY_NUMBER_TYPE_CHOICES, 
        default='SSN'
    )
    ssn_last_four = models.CharField(max_length=4, blank=True, null=True)
    ssn_stored_in_stripe = models.BooleanField(default=False)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    
    def save_ssn_to_stripe(self, ssn):
        """Save SSN to Stripe instead of storing it directly"""
        # Implementation handles secure Stripe storage
        # Only stores last 4 digits locally
        pass
```

### Security Number Type Choices
```python
SECURITY_NUMBER_TYPE_CHOICES = [
    ('SSN', 'Social Security Number (US)'),
    ('NIN', 'National Insurance Number (UK)'),
    ('SIN', 'Social Insurance Number (Canada)'),
    ('TFN', 'Tax File Number (Australia)'),
    ('NRIC', 'National Registration Identity Card (Singapore)'),
    ('AADHAAR', 'Aadhaar Number (India)'),
    ('CPF', 'CPF Number (Brazil)'),
    ('CURP', 'CURP (Mexico)'),
    ('DNI', 'DNI Number (Spain, Argentina, Peru)'),
    ('HKID', 'Hong Kong Identity Card'),
    ('NINO', 'National Identity Number (Sweden)'),
    ('BSN', 'Citizen Service Number (Netherlands)'),
    ('PESEL', 'PESEL Number (Poland)'),
    ('RUT', 'RUT Number (Chile)'),
    ('CNIC', 'CNIC Number (Pakistan)'),
    ('MYKAD', 'MyKad Number (Malaysia)'),
    ('KTP', 'KTP Number (Indonesia)'),
    ('PAN', 'PAN Card Number (India)'),
    ('NIF', 'NIF Number (Portugal)'),
    ('IRD', 'IRD Number (New Zealand)'),
    ('PPS', 'PPS Number (Ireland)'),
    ('IQAMA', 'Iqama Number (Saudi Arabia)'),
    ('OTHER', 'Other National ID'),
]
```

---

## Implementation Guide

### 1. Setting Up Employee Management

#### Prerequisites
- Django backend with HR app installed
- Next.js frontend with employee management routes
- Stripe account for secure storage
- PostgreSQL with RLS enabled

#### Environment Variables
```bash
# Backend (.env)
STRIPE_SECRET_KEY=sk_...
CLAUDE_API_KEY=sk-ant-api03-...
REDIS_URL=redis://...

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.dottapps.com
```

### 2. Creating an Employee

#### Frontend Flow
```javascript
// 1. User selects country
handleCountryChange('UK');

// 2. Form updates automatically
// Label: "National Insurance Number"
// Placeholder: "XX 12 34 56 X"
// Type: "NIN"

// 3. User submits form
const employeeData = {
  firstName: 'John',
  lastName: 'Smith',
  country: 'UK',
  securityNumber: 'AB123456C', // Full number
  // ... other fields
};

// 4. API call with secure transmission
await hrApi.employees.create(employeeData);
```

#### Backend Processing
```python
# 1. Receive employee data
def employee_list(request):
    if request.method == 'POST':
        employee_data = request.data.copy()
        security_number = employee_data.pop('securityNumber', None)
        
        # 2. Create employee record
        serializer = EmployeeSerializer(data=employee_data)
        if serializer.is_valid():
            employee = serializer.save()
            
            # 3. Secure storage in Stripe
            if security_number:
                employee.save_ssn_to_stripe(security_number)
                # Only last 4 digits stored locally
```

### 3. Retrieving Employee Data

#### Security Considerations
```python
# Backend never returns full SSN/TIN
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'firstName', 'lastName', 'ssnLastFour']
        # 'securityNumber' field excluded for security
```

---

## Troubleshooting

### Common Issues

#### 1. 403 Forbidden Error
**Symptoms**: 
- API returns 403 when accessing employee endpoints
- Console shows "Access denied" messages

**Causes**:
- Missing authentication session
- Invalid tenant ID in headers
- User lacks HR permissions

**Solutions**:
```javascript
// Check session validity
const session = await fetch('/api/auth/session-v2');

// Verify tenant ID is included
headers: {
  'X-Tenant-ID': tenantId,
  'Authorization': `Session ${sessionId}`
}

// Check user permissions in backend
logger.info(f'User: {request.user.email}, Tenant: {tenant_id}');
```

#### 2. SSN/TIN Not Saving to Stripe
**Symptoms**:
- Employee created but ssn_stored_in_stripe = False
- Error logs show Stripe API failures

**Solutions**:
```python
# Check Stripe configuration
def save_ssn_to_stripe(self, ssn):
    try:
        # Verify Stripe secret key is set
        if not settings.STRIPE_SECRET_KEY:
            raise ValueError("Stripe secret key not configured")
            
        # Log the attempt
        logger.info(f'Storing SSN for employee {self.id}')
        
        # ... Stripe API call
    except Exception as e:
        logger.error(f'Stripe storage failed: {str(e)}')
        raise
```

#### 3. Country/Tax ID Mismatch
**Symptoms**:
- Wrong tax ID label for selected country
- Form validation errors

**Solutions**:
```javascript
// Verify country mapping exists
const getSecurityNumberInfo = (countryCode) => {
  const info = COUNTRY_TO_SECURITY_NUMBER[countryCode];
  if (!info) {
    console.warn(`No tax ID mapping for country: ${countryCode}`);
    return COUNTRY_TO_SECURITY_NUMBER['OTHER'];
  }
  return info;
};

// Add missing countries to mapping
'NEW_COUNTRY': { 
  type: 'TYPE', 
  label: 'Local Tax ID Name', 
  placeholder: 'Format example' 
}
```

#### 4. Compensation Type Toggle Issues
**Symptoms**:
- Wrong fields showing for salary vs wage
- Form data not updating

**Solutions**:
```javascript
// Ensure state updates correctly
const handleCompensationTypeChange = (type) => {
  setFormData(prev => ({
    ...prev,
    compensationType: type,
    // Clear opposite field
    ...(type === 'SALARY' ? { wagePerHour: '' } : { salary: '' })
  }));
};
```

### Debugging Tools

#### 1. Backend Logging
```python
# Add comprehensive logging
logger.info(f'🚀 [HR API] User: {request.user.email}')
logger.info(f'📊 [HR API] Data: {request.data.keys()}')
logger.info(f'✅ [HR API] Success: Employee {employee.id}')
logger.error(f'❌ [HR API] Error: {str(e)}')
```

#### 2. Frontend Debugging
```javascript
// API client logging
logger.info('🚀 [HRApi] Creating employee:', {
  ...data,
  securityNumber: data.securityNumber ? '[REDACTED]' : 'not provided'
});

// Form state debugging
console.log('Form data:', {
  ...formData,
  securityNumber: formData.securityNumber ? '[REDACTED]' : 'empty'
});
```

#### 3. Network Inspection
- Check browser Network tab for API calls
- Verify request headers include tenant ID
- Confirm response status and error messages
- Check CORS headers are present

### Performance Optimization

#### 1. Database Queries
```python
# Optimize employee queries
employees = Employee.objects.select_related('tenant').prefetch_related('roles')
```

#### 2. Frontend Caching
```javascript
// Cache employee data
const [employees, setEmployees] = useState([]);
const [lastFetch, setLastFetch] = useState(null);

// Only refetch if data is stale
if (!lastFetch || Date.now() - lastFetch > 300000) { // 5 minutes
  fetchEmployees();
}
```

---

## Best Practices

### 1. Security
- ✅ Never log full SSN/TIN numbers
- ✅ Always use HTTPS for API calls
- ✅ Validate input on both frontend and backend
- ✅ Implement rate limiting on sensitive endpoints
- ✅ Use session-based authentication

### 2. User Experience
- ✅ Show clear security notices to users
- ✅ Provide real-time validation feedback
- ✅ Use appropriate input masks for tax IDs
- ✅ Auto-detect tax ID type from country
- ✅ Handle loading states gracefully

### 3. Code Quality
- ✅ Use TypeScript for better type safety
- ✅ Implement comprehensive error handling
- ✅ Add unit tests for critical functions
- ✅ Document all API endpoints
- ✅ Follow consistent naming conventions

### 4. Compliance
- ✅ Follow GDPR guidelines for EU employees
- ✅ Implement data retention policies
- ✅ Provide data export capabilities
- ✅ Maintain audit trails for sensitive operations
- ✅ Regular security audits of Stripe integration

---

## Support

For additional support or questions:

1. **Documentation**: Check `/docs/TROUBLESHOOTING.md`
2. **API Reference**: See backend API documentation
3. **Security Questions**: Contact security team for Stripe-related issues
4. **Bug Reports**: Create GitHub issues with detailed reproduction steps

---

*This documentation is maintained as part of the Dott Project employee management system.*