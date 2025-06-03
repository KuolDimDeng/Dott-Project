# Timesheet Model Consolidation

## Overview
This document explains the consolidation of timesheet models in the PyFactor application. Previously, there were two separate Timesheet models:
1. One in the `hr` module 
2. One in the `payroll` module

This created redundancy, potential inconsistencies, and made reporting difficult. The application has been refactored to use a single Timesheet model in the `hr` module.

## Changes Made

1. Added `timesheet_number` field to the HR Timesheet model
2. Added `timesheet` ForeignKey to the PayrollTransaction model
3. Migrated data from payroll.Timesheet to hr.Timesheet
4. Updated PayrollTransaction records to link to the HR Timesheet model
5. Removed the Timesheet and TimesheetEntry models from the payroll module
6. Updated serializers, views, and other references across the codebase

## Current Model Relationships

- **Employee** has many **Timesheets** (one-to-many)
- **Timesheet** has many **TimesheetEntries** (one-to-many)
- **Timesheet** has many **PayrollTransactions** (one-to-many through related_name='payroll_transactions')
- **PayrollRun** has many **PayrollTransactions** (one-to-many)
- **PayrollTransaction** belongs to **Employee**, **PayrollRun**, and **Timesheet**

## Timesheet Workflow

1. Employee creates a timesheet and adds entries for a period
2. Employee submits timesheet (status changes to 'SUBMITTED')
3. Manager reviews and approves timesheet (status changes to 'APPROVED')
4. When payroll is run, the system finds approved timesheets for the period
5. PayrollTransactions are created, linking to the employee, payroll run, and the approved timesheet
6. The timesheet is now linked to a financial transaction, creating an audit trail

## Fields in HR Timesheet Model

- `id`: UUID primary key
- `timesheet_number`: Unique identifier (format: TMS######)
- `employee`: ForeignKey to Employee
- `business_id`: UUID for tenant isolation
- `status`: Current status (DRAFT, SUBMITTED, APPROVED, REJECTED)
- `period_start`: Start date of the timesheet period
- `period_end`: End date of the timesheet period
- `submitted_at`: When the timesheet was submitted
- `approved_by`: ForeignKey to the Employee who approved the timesheet
- `approved_at`: When the timesheet was approved
- `rejection_reason`: Reason if rejected
- `total_regular_hours`: Total regular hours in the timesheet
- `total_overtime_hours`: Total overtime hours in the timesheet
- `notes`: Additional notes
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Migration Scripts

- `0008_timesheet_timesheet_number.py`: Added timesheet_number field to HR Timesheet
- `0002_add_timesheet_to_payrolltransaction.py`: Added timesheet field to PayrollTransaction
- `0003_remove_timesheet_models.py`: Removed Timesheet and TimesheetEntry from payroll app
- `Version0002_MigrateTimesheetData.py`: Script to migrate data between models

## API Endpoints

All timesheet-related API endpoints now use the HR Timesheet model. The payroll system references this model when running payroll calculations.

## Future Considerations

- Consider adding a flag to mark timesheets as "processed by payroll" to avoid double-processing
- Add validation to ensure total_regular_hours and total_overtime_hours match the sum of their entries
- Implement more detailed reporting that connects timesheets directly to payroll outcomes 