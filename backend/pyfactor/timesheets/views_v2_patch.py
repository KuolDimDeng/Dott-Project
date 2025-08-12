"""
Patch for timesheet views to fix hourly_rate field name issue
"""

def get_employee_hourly_rate(employee):
    """
    Get the hourly rate for an employee, handling different field names
    """
    # Try different field names
    if hasattr(employee, 'hourly_rate') and employee.hourly_rate is not None:
        return employee.hourly_rate
    elif hasattr(employee, 'wage_per_hour') and employee.wage_per_hour is not None:
        return employee.wage_per_hour
    elif hasattr(employee, 'salary') and employee.salary is not None:
        # Convert annual salary to hourly rate (assuming 2080 hours/year)
        return employee.salary / 2080
    else:
        return None