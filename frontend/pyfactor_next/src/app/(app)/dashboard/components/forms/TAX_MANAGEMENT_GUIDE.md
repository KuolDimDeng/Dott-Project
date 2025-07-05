# Tax Management Guide

This guide explains how to use the Tax Management system in the HR module. This system allows HR staff to manage employee tax forms, withholdings, and compliance reporting.

## Accessing Tax Management

To access Tax Management:

1. Navigate to the main dashboard
2. From the left navigation menu, select "HR" → "Taxes"
3. The Tax Management interface will load in the main content area

## Features

The Tax Management component provides the following functionality:

### Employee Selection

1. Search for employees by name or ID
2. View a list of matching employees
3. Select an employee to manage their tax information

### Tax Forms Management

Once an employee is selected, you can:

1. View existing tax forms for the employee
2. Add new tax forms
3. Edit existing tax forms
4. Download tax forms (if documents are attached)

### Supported Tax Form Types

The system supports various tax form types including:

- W-2 Wage and Tax Statement
- W-4 Employee Withholding Certificate 
- 1099-MISC Miscellaneous Income
- 1095-C Employer-Provided Health Insurance
- Form 940 Federal Unemployment Tax
- Form 941 Quarterly Federal Tax Return
- State Withholding Forms
- Other custom tax forms

## Adding a New Tax Form

To add a new tax form for an employee:

1. Select the employee from the employee list
2. Click the "Add Tax Form" button
3. Select the form type from the dropdown menu
4. Enter the tax year
5. Select the filing status
6. Enter any additional form-specific information
7. Optionally upload a form document (PDF, JPG, or PNG)
8. Click "Save" to submit the form

## Editing a Tax Form

To edit an existing tax form:

1. Locate the form in the employee's tax forms list
2. Click the "Edit" button (pencil icon)
3. Modify the form details as needed
4. Click "Save" to update the form

## Implementation Notes

- The Tax Management component connects to the HR database via secure API calls
- All data is tenant-isolated to maintain data security
- Forms are validated before submission to ensure compliance
- The system maintains an audit trail of all tax form changes

## Related Components

- Employee Management: Manages employee basic information
- Payroll: Uses tax form information for payroll calculations
- Reports: Generates tax-related reports for compliance and analysis

## Technical Details

- Component: `TaxManagement.js`
- API Endpoints: 
  - `/api/hr/taxes/forms` - Get/create/update tax forms
  - `/api/hr/taxes/states` - Get available states for tax forms
  - `/api/hr/employees` - Get employee information
- Authentication: Requires HR role permissions

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0     | 2023-05-20 | Initial implementation |
| 1.1     | 2023-05-20 | Fixed navigation from HR menu | 