# Django Model Conflict Resolution Summary

## Issue
Django makemigrations was failing due to reverse accessor clashes between models in the `hr` and `timesheets` apps.

## Conflicts Found
1. **Timesheet model** exists in both:
   - `hr.models.Timesheet` 
   - `timesheets.models.Timesheet`

2. **TimeOffRequest model** exists in both:
   - `hr.models.TimeOffRequest`
   - `timesheets.models.TimeOffRequest`

## Resolution Applied

### In `timesheets/models.py`:

1. **Timesheet model** - Updated related_names:
   - `employee` field: Changed `related_name='timesheets'` to `related_name='timesheet_records'`
   - `supervisor` field: Changed `related_name='supervised_timesheets'` to `related_name='supervised_timesheet_records'`
   - `approved_by` field: Changed `related_name='approved_timesheets'` to `related_name='approved_timesheet_records'`

2. **TimeOffRequest model** - Updated related_names:
   - `employee` field: Changed `related_name='time_off_requests'` to `related_name='timeoff_requests'`
   - `reviewed_by` field: Changed `related_name='reviewed_time_off_requests'` to `related_name='reviewed_timeoff_requests'`

## Additional Notes

- The `Invoice` model is defined in `sales.models` (not a separate invoices app)
- The `Vendor` model is defined in `purchases.models` (not a separate vendors app)
- Both `sales` and `purchases` apps are already in INSTALLED_APPS

## Next Steps

Run the following commands to apply the changes:
```bash
python manage.py makemigrations
python manage.py migrate
```