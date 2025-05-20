# Benefits Management Documentation

## Overview
The Benefits Management feature in the HR module allows employees to view and manage their benefits, while administrators can configure and oversee company-wide benefits programs. This implementation adds a comprehensive `Benefits` model to the backend that integrates with the existing frontend Benefits Management components.

## Version History
- v1.0 (November 15, 2023) - Initial implementation with basic benefits management functionality

## Model Structure
The `Benefits` model includes the following main components:

1. **Basic Information**
   - UUID primary key
   - One-to-one relationship with Employee model
   - Business ID for tenant isolation
   - Enrollment status and dates

2. **Health Insurance**
   - Plan type (None, Basic, Standard, Premium, Family)
   - Provider information
   - Policy number
   - Cost

3. **Dental Insurance**
   - Plan type (None, Basic, Standard, Premium, Family)
   - Provider information
   - Policy number
   - Cost

4. **Vision Insurance**
   - Plan type (None, Basic, Standard, Premium, Family)
   - Provider information
   - Policy number
   - Cost

5. **Retirement Plan**
   - Plan type (401(k), Roth 401(k), IRA, Roth IRA, Pension, Other)
   - Employee contribution percentage
   - Employer match percentage

6. **Additional Benefits**
   - Life Insurance
   - Disability Insurance
   - Flexible Spending Account (FSA)
   - Health Savings Account (HSA)
   - Custom additional benefits (JSON field)

## API Endpoints

### Benefits List/Create
- **URL**: `/api/hr/benefits/`
- **Methods**: GET, POST
- **Permissions**: HR Admin, Manager, Owner
- **Description**: List all benefits for a company or create a new benefits record

### Employee Benefits Detail
- **URL**: `/api/hr/employees/<employee_id>/benefits/`
- **Methods**: GET, PUT, DELETE
- **Permissions**: 
  - GET: Employee (own record only), HR Admin, Manager, Owner
  - PUT: Employee (limited fields), HR Admin, Owner
  - DELETE: HR Admin, Owner
- **Description**: Retrieve, update, or delete an employee's benefits

## Frontend Integration
The Benefits model integrates with the existing frontend components:

1. **BenefitsManagement.js** - Main component with tabs for different functions
2. **MyBenefits.js** - Shows the current employee's benefits information
3. **BenefitsAdmin.js** - Administrative interface for managing employee benefits
4. **BenefitsSettings.js** - Configuration interface for company-wide benefits settings

The frontend uses API utilities to fetch and update benefits data from the backend.

## Implementation Notes

### Data Security
- Sensitive benefits information is stored securely in the database
- Row-Level Security (RLS) is implemented through `business_id` field
- Access controls limit who can view and modify benefits data

### User Permissions
- Regular employees can only view their own benefits and update limited fields
- Managers can view benefits for their team members
- HR Admins and Owners have full control over benefits configuration

## Usage

### For Employees
Employees can:
- View their enrolled benefits
- See costs and coverage details
- Update their retirement contribution percentage

### For HR Administrators
HR Administrators can:
- Configure benefits plans for employees
- Enroll employees in different plans
- Manage open enrollment periods
- Update benefit costs and coverage details

## Future Enhancements
- Support for multiple health insurance providers
- Ability to upload and store benefits-related documents
- Automated notifications for open enrollment periods
- Benefits cost calculators
- Benefits comparison tools

## Related Files
- `/backend/pyfactor/hr/models.py` - Contains the Benefits model definition
- `/backend/pyfactor/hr/api/views.py` - Contains the Benefits API views
- `/backend/pyfactor/hr/serializers.py` - Contains the Benefits serializer
- `/frontend/pyfactor_next/src/app/dashboard/components/forms/benefits/` - Frontend components 