# Backend Script Registry

This document tracks all backend scripts created for fixing issues or implementing features in the ProjectX application.

## Backend Scripts

| Script ID | Script Name | Purpose | Created Date | Status | Applied To |
|-----------|-------------|---------|-------------|--------|------------|
| B0038 | Version0038_docker_eb_comprehensive_fix.js | Comprehensive fix for Docker deployment to AWS Elastic Beanstalk | 2025-05-17 | Ready | Dockerrun.aws.json, .ebextensions/ |
| B0004 | Version0004_FixRedisSSL_Settings.py | Removes SSL settings from Redis cache configuration | 2023-05-03 | Executed | pyfactor/settings.py |
| B0003 | Version0003_DirectFix_TemplatesSSL.py | Directly fixes the TEMPLATES section in settings.py by removing SSL settings | 2023-05-03 | Executed | pyfactor/settings.py |
| B0002 | Version0002_FixTemplateSSL_Settings.py | Fixes erroneously added SSL settings in the TEMPLATES section | 2023-05-03 | Executed | pyfactor/settings.py |
| B0001 | Version0001_EnableSSL_DatabaseSettings.py | Modifies database settings to properly handle SSL connections in the backend | 2023-05-03 | Executed | pyfactor/settings.py |

## Script Status Definitions

- **Ready**: Script has been created and is ready to be executed
- **Executed**: Script has been executed successfully in the development environment
- **Deployed**: Script has been deployed to production environment
- **Failed**: Script execution failed, check logs for details
- **Deprecated**: Script is no longer needed or has been replaced
- **Requires Review**: Script needs to be reviewed before execution

## Execution Instructions

Before running any script:
1. **Make sure you have a backup of the target files**
2. Check this registry to see if the script has dependencies
3. Verify the script status before running it
4. After execution, update the status in this registry

### Running Backend Scripts

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
python <script_name>.py
```

## Script Inventory

| Version | Script Name | Description | Date | Status |
|---------|------------|-------------|------|--------|
| 0001 | `Version0001_BankingModels_FixLinterErrors.py` | Fix linter errors in Banking Models | 2025-04-28 | Applied |
| 0002 | `Version0002_BankingModels_LinterNotes.py` | Document linter limitation with dynamic imports | 2025-04-28 | Applied |
| 0003 | `Version0003_Create_Country_Payment_Gateway_Mapping.py` | Creates a country to payment gateway mapping for Connect to Bank feature | 2024-05-30 | Applied |
| 0004 | `Version0004_Update_Country_Payment_Gateway_Model.py` | Updates CountryPaymentGateway model to support multiple gateways per country | 2024-05-30 | Applied |
| 0005 | `Version0005_Prioritize_Plaid_Gateway.py` | Updates country-gateway mappings to prioritize Plaid in supported countries | 2025-04-28 | Applied |
| 0006 | `payroll_migration_fix.md` | Generated and applied missing payroll migrations for new models | 2025-04-28 | Applied |

## Usage Guidelines

1. All scripts should follow the naming convention: `Version<number>_<description>_<file_modified>.py`
2. Scripts should be documented with a header explaining their purpose
3. Before executing any script, back up affected files
4. Each script should be listed in this registry with current status
5. Scripts should handle errors gracefully and provide logging

## Execution Status Definitions

- **Applied**: Script has been executed and changes are in production
- **Pending**: Script has been created but not yet executed
- **Deprecated**: Script is no longer applicable but kept for historical purposes
- **Failed**: Script execution failed and requires investigation

## Important Notes

- Scripts that modify database models should be coordinated with migrations
- Always test scripts in a development environment before applying to production
- For critical changes, a more formal migration approach should be used instead of scripts

## Backend Scripts

| Script Name | Purpose | Author | Date | Status | Last Execution |
|-------------|---------|--------|------|--------|----------------|
| No scripts executed yet | | | | | |

## Instructions for Execution

1. Navigate to the scripts directory: `cd /Users/kuoldeng/projectx/backend/pyfactor/scripts`
2. Activate the virtual environment if needed: `source ../../../.venv/bin/activate`
3. Run the script: `python <script_name>.py`
4. After execution, update the Status and Last Execution columns in this registry

## Notes on Script Design

- All scripts should include a version number in the filename
- Scripts should create backups before modifying files
- Scripts should have comprehensive documentation within the file
- Scripts should log all operations they perform
- Scripts should have error handling to prevent partial/broken changes
- For database operations, scripts should implement transaction rollback capabilities

## Backend Script Registry

This file tracks all backend scripts that have been executed in the system.

| Script Version | Description | Execution Date | Status |
|----------------|-------------|----------------|--------|
| Version0001_add_page_privileges_model | Add UserPagePrivilege model for page-level access control | 2023-06-25T14:30:00Z | Completed |

## Backend Scripts

| Script Name | Version | Purpose | Status | Date |
| Version0007_fix_cors_business_id_in_cors_middleware.py | 1.0 | Fix CORS middleware to include business ID headers | Completed | 2025-04-23 |
| Version0007_fix_hr_api_authentication.py | 1.0 | Fix HR API authentication and business ID header handling | Completed | 2025-04-23 |
| Version0006_fix_cors_headers_for_business_id.py | 1.0 | Fix CORS headers for business_id in settings.py | Completed | 2025-04-23 |
|-------------|---------|---------|--------|------|
| Version0001_Fix_Owner_Employee_Permission.py | 1.0 | Fix owner permission issue in employee creation | Completed | 2025-04-22 |
| Version0002_Update_Employee_Form_and_Role.py | 1.0 | Update employee form: add DOB field, remove role field, set role to 'user' | Completed | 2025-04-22 |

## Future Scripts

We may need to create the following backend scripts to support the page-level access control feature:

1. A script to create the necessary database schema updates (if needed)
2. A script to implement the API endpoint for retrieving user page privileges

## Script Development Guidelines

1. Use the versioning convention: `Version####_Description.py`
2. Include comprehensive documentation within the script
3. Always create backups before modifying files
4. Add error handling and logging
5. Update this registry after creating a new script 
## Version 0.0.2 - Add Owner Employee Records
- Date: 2024-03-21
- Author: Claude
- Description: Added employee records for users with owner role and updated user creation process to automatically create employee records for new owners.
- Changes:
  - Added migration script to create employee records for existing owners
  - Updated user creation process to automatically create employee records for new owners
  - Added user field to Employee model to link with User model
| Version0001_verify_profile_api.py | 1.0 | Verify user profile API configuration | 2025-04-26 15:13:39 | Completed | Checked UserProfile model and API configuration |

# PyFactor Script Registry

This file tracks all scripts created for maintenance, data migration, and other administrative tasks in the PyFactor application.

## Timesheet Model Consolidation Scripts

| Script Name | Version | Purpose | Execution Status | Date Executed | Executed By |
|-------------|---------|---------|-----------------|---------------|-------------|
| Version0001_TimesheetModelConsolidation.py | 1.0 | Analyzes dependencies and provides a plan for consolidating timesheet models | Completed | 2025-04-25 | System Admin |
| Version0002_MigrateTimesheetData.py | 1.0 | Migrates data from payroll.Timesheet to hr.Timesheet | Pending | - | - |

## Execution Steps for Timesheet Consolidation

1. Run Django migrations to add timesheet_number field to HR Timesheet:
   ```
   python manage.py migrate hr 0008_timesheet_timesheet_number
   ```

2. Run Django migrations to add timesheet field to PayrollTransaction:
   ```
   python manage.py migrate payroll 0002_add_timesheet_to_payrolltransaction
   ```

3. Run data migration script:
   ```
   python backend/pyfactor/scripts/Version0002_MigrateTimesheetData.py
   ```

4. Verify data integrity after migration

5. Run Django migrations to remove Timesheet models from payroll app:
   ```
   python manage.py migrate payroll 0003_remove_timesheet_models
   ```

## Post-Migration Verification Checklist

- [ ] All payroll.Timesheet records have been migrated to hr.Timesheet
- [ ] All PayrollTransaction records have been linked to the correct hr.Timesheet
- [ ] Employee → Timesheet → PayrollTransaction relationships are intact
- [ ] Frontend components work with the new model structure
- [ ] Payroll processing works with the consolidated model

## Additional Notes

The scripts should be run in a test environment first to ensure all data is correctly migrated. Make backups of the database before running these scripts in production.


## HR Reports Management Implementation - 2025-04-27

### Script: Version0001_Add_HRReportManagement_Component.js

#### Description
Implements the HR Reports Management component that displays tabs for different report categories:
- Employee reports
- Pay reports
- Timesheet reports
- Benefits reports

#### Changes Made
1. Created new HRReportManagement component with tabs for the different report categories
2. Added documentation in HR_REPORT_MANAGEMENT.md
3. Updated RenderMainContent.js to handle the new component
4. Updated DashboardContent.js to add state handling for reports management
5. Enhanced the Reports menu item in listItems.js to use the standardized onClick pattern

#### Status
- [x] Implemented
- [ ] Connected to backend API

#### Future Work
- Connect to backend API for real report generation
- Add report filters and parameters
- Implement report export functionality (PDF, CSV)
- Add data visualization for key metrics

| Script Name | Purpose | Status | Date |
|-------------|---------|--------|------|
| Version0001_create_benefits_model.py | Adds a Benefits model to hr/models.py and links it with the Employee model | Executed | 2023-11-15 |

## AWS EB Docker Deployment Fixes - 2025-05-18
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0038_docker_eb_comprehensive_fix.js | 1.0 | Comprehensive fix for AWS EB Docker deployment | Completed | 2025-05-18 |

The script addressed the following issues:
1. Port mismatch between Dockerfile (8080) and Dockerrun.aws.json (8000)
2. Package size issues by creating a minimal deployment package (minimal-eb-package-2025-05-18123230.zip)
3. Configuration parameter issues by removing unsupported WSGI parameters
4. Updated .ebextensions to be compatible with Docker deployment

Instructions for deployment:
1. Upload the minimal package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment
4. Monitor the deployment and check for health status

## AWS EB Docker Deployment Fixes - 2025-05-18
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0038_docker_eb_comprehensive_fix.js | 1.0 | Comprehensive fix for AWS EB Docker deployment | Completed | 2025-05-18 |

The script addressed the following issues:
1. Port mismatch between Dockerfile (8080) and Dockerrun.aws.json (8000)
2. Package size issues by creating a minimal deployment package (minimal-eb-package-2025-05-18123434.zip)
3. Configuration parameter issues by removing unsupported WSGI parameters
4. Updated .ebextensions to be compatible with Docker deployment

Instructions for deployment:
1. Upload the minimal package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment
4. Monitor the deployment and check for health status

## AWS EB Docker Deployment Fixes - 2025-05-18
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0038_docker_eb_comprehensive_fix.js | 1.0 | Comprehensive fix for AWS EB Docker deployment | Completed | 2025-05-18 |

The script addressed the following issues:
1. Port mismatch between Dockerfile (8080) and Dockerrun.aws.json (8000)
2. Package size issues by creating a minimal deployment package (minimal-eb-package-2025-05-18123557.zip)
3. Configuration parameter issues by removing unsupported WSGI parameters
4. Updated .ebextensions to be compatible with Docker deployment

Instructions for deployment:
1. Upload the minimal package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment
4. Monitor the deployment and check for health status

## AWS EB Docker Build Fix - 2025-05-18
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0039_fix_docker_build.js | 1.0 | Fix Docker build issues in AWS EB deployment | Completed | 2025-05-18 |

The script addressed the following issues:
1. Created a more comprehensive deployment package with necessary files
2. Updated the Dockerfile to ensure compatibility with minimal package
3. Created a new enhanced package (enhanced-eb-package-2025-05-18130247.zip) for deployment

Instructions for deployment:
1. Upload the enhanced package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment with the DottConfiguration
4. Monitor the deployment and check for health status

## AWS EB Docker Deployment Fixes - 2025-05-18
    
| Script Name | Version | Purpose | Status | Date |
|-------------|---------|---------|--------|------|
| Version0038_docker_eb_comprehensive_fix.js | 1.0 | Comprehensive fix for AWS EB Docker deployment | Completed | 2025-05-18 |

The script addressed the following issues:
1. Port mismatch between Dockerfile (8080) and Dockerrun.aws.json (8000)
2. Package size issues by creating a minimal deployment package (minimal-eb-package-2025-05-18132724.zip)
3. Configuration parameter issues by removing unsupported WSGI parameters
4. Updated .ebextensions to be compatible with Docker deployment

Instructions for deployment:
1. Upload the minimal package to AWS Elastic Beanstalk console
2. Create a new application version
3. Deploy the application version to your environment
4. Monitor the deployment and check for health status
