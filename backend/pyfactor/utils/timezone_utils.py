"""
Timezone utility functions for consistent timezone handling across frontend and backend
Ensures IANA timezone format consistency and proper validation
"""

import pytz
from datetime import datetime
from django.utils import timezone as django_timezone


def validate_timezone(timezone_str):
    """
    Validate timezone string using IANA format (e.g., America/New_York)
    
    Args:
        timezone_str (str): Timezone string to validate
        
    Returns:
        bool: True if valid timezone, False otherwise
    """
    try:
        pytz.timezone(timezone_str)
        return True
    except pytz.UnknownTimeZoneError:
        return False


def normalize_timezone(timezone_str):
    """
    Normalize timezone string to IANA format
    
    Args:
        timezone_str (str): Timezone string to normalize
        
    Returns:
        str: Normalized timezone string or 'UTC' if invalid
    """
    if not timezone_str:
        return 'UTC'
    
    # Handle common variations
    timezone_mappings = {
        'EDT': 'America/New_York',
        'EST': 'America/New_York',
        'CDT': 'America/Chicago',
        'CST': 'America/Chicago',
        'MDT': 'America/Denver',
        'MST': 'America/Denver',
        'PDT': 'America/Los_Angeles',
        'PST': 'America/Los_Angeles',
        'GMT': 'UTC',
        'UTC': 'UTC',
    }
    
    # Check if it's a common abbreviation
    if timezone_str.upper() in timezone_mappings:
        return timezone_mappings[timezone_str.upper()]
    
    # Validate as IANA timezone
    if validate_timezone(timezone_str):
        return timezone_str
    
    # Default to UTC if invalid
    return 'UTC'


def get_timezone_display_name(timezone_str):
    """
    Get user-friendly display name for timezone
    
    Args:
        timezone_str (str): IANA timezone string
        
    Returns:
        str: User-friendly timezone display name
    """
    try:
        tz = pytz.timezone(timezone_str)
        
        # Get current time in timezone to determine if DST is active
        now = datetime.now(tz)
        
        # Common timezone display names
        display_names = {
            'America/New_York': 'Eastern Time',
            'America/Chicago': 'Central Time',
            'America/Denver': 'Mountain Time',
            'America/Los_Angeles': 'Pacific Time',
            'America/Phoenix': 'Arizona Time',
            'America/Anchorage': 'Alaska Time',
            'Pacific/Honolulu': 'Hawaii Time',
            'UTC': 'UTC',
            'Europe/London': 'GMT/BST',
            'Europe/Paris': 'CET/CEST',
            'Asia/Tokyo': 'Japan Time',
            'Asia/Shanghai': 'China Time',
            'Asia/Kolkata': 'India Time',
            'Australia/Sydney': 'Sydney Time',
            'Africa/Nairobi': 'East Africa Time',
        }
        
        if timezone_str in display_names:
            return display_names[timezone_str]
        
        # Fallback to timezone name with underscores replaced by spaces
        return timezone_str.replace('_', ' ').replace('/', ' - ')
        
    except pytz.UnknownTimeZoneError:
        return timezone_str


def convert_datetime_to_timezone(dt, target_timezone):
    """
    Convert datetime to target timezone
    
    Args:
        dt (datetime): Datetime object to convert
        target_timezone (str): Target timezone string
        
    Returns:
        datetime: Converted datetime in target timezone
    """
    try:
        if not dt:
            return dt
            
        # Ensure datetime is timezone-aware
        if dt.tzinfo is None:
            dt = django_timezone.make_aware(dt, django_timezone.utc)
        
        # Convert to target timezone
        target_tz = pytz.timezone(normalize_timezone(target_timezone))
        return dt.astimezone(target_tz)
        
    except (pytz.UnknownTimeZoneError, ValueError):
        return dt


def format_datetime_for_frontend(dt, user_timezone):
    """
    Format datetime for consistent frontend display
    
    Args:
        dt (datetime): Datetime to format
        user_timezone (str): User's timezone
        
    Returns:
        str: Formatted datetime string
    """
    try:
        if not dt:
            return ''
            
        # Convert to user's timezone
        user_dt = convert_datetime_to_timezone(dt, user_timezone)
        
        # Format for frontend (ISO format)
        return user_dt.isoformat()
        
    except Exception:
        return dt.isoformat() if dt else ''


def get_common_timezones():
    """
    Get list of common timezones for dropdown selection
    
    Returns:
        list: List of timezone dictionaries with value and label
    """
    return [
        # US & Canada
        {'value': 'America/New_York', 'label': 'Eastern Time (ET)', 'group': 'US & Canada'},
        {'value': 'America/Chicago', 'label': 'Central Time (CT)', 'group': 'US & Canada'},
        {'value': 'America/Denver', 'label': 'Mountain Time (MT)', 'group': 'US & Canada'},
        {'value': 'America/Phoenix', 'label': 'Arizona Time', 'group': 'US & Canada'},
        {'value': 'America/Los_Angeles', 'label': 'Pacific Time (PT)', 'group': 'US & Canada'},
        {'value': 'America/Anchorage', 'label': 'Alaska Time', 'group': 'US & Canada'},
        {'value': 'Pacific/Honolulu', 'label': 'Hawaii Time', 'group': 'US & Canada'},
        
        # Europe
        {'value': 'Europe/London', 'label': 'London (GMT/BST)', 'group': 'Europe'},
        {'value': 'Europe/Paris', 'label': 'Paris (CET/CEST)', 'group': 'Europe'},
        {'value': 'Europe/Berlin', 'label': 'Berlin (CET/CEST)', 'group': 'Europe'},
        {'value': 'Europe/Moscow', 'label': 'Moscow (MSK)', 'group': 'Europe'},
        
        # Asia
        {'value': 'Asia/Tokyo', 'label': 'Tokyo (JST)', 'group': 'Asia'},
        {'value': 'Asia/Shanghai', 'label': 'China (CST)', 'group': 'Asia'},
        {'value': 'Asia/Kolkata', 'label': 'India (IST)', 'group': 'Asia'},
        {'value': 'Asia/Dubai', 'label': 'Dubai (GST)', 'group': 'Asia'},
        
        # Africa
        {'value': 'Africa/Nairobi', 'label': 'Nairobi (EAT)', 'group': 'Africa'},
        {'value': 'Africa/Lagos', 'label': 'Lagos (WAT)', 'group': 'Africa'},
        {'value': 'Africa/Johannesburg', 'label': 'Johannesburg (SAST)', 'group': 'Africa'},
        
        # Australia & Pacific
        {'value': 'Australia/Sydney', 'label': 'Sydney (AEST/AEDT)', 'group': 'Australia & Pacific'},
        {'value': 'Australia/Perth', 'label': 'Perth (AWST)', 'group': 'Australia & Pacific'},
        {'value': 'Pacific/Auckland', 'label': 'Auckland (NZST/NZDT)', 'group': 'Australia & Pacific'},
        
        # UTC
        {'value': 'UTC', 'label': 'UTC (Coordinated Universal Time)', 'group': 'UTC'},
    ]


def detect_timezone_from_js(js_timezone):
    """
    Detect and normalize timezone from JavaScript Intl.DateTimeFormat().resolvedOptions().timeZone
    
    Args:
        js_timezone (str): Timezone from JavaScript
        
    Returns:
        str: Normalized IANA timezone string
    """
    if not js_timezone:
        return 'UTC'
    
    # JavaScript returns IANA format, so just validate and normalize
    return normalize_timezone(js_timezone)