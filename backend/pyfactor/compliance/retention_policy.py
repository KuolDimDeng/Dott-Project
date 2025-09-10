"""
Data Retention Policy Configuration
Compliant with GDPR, CCPA, COPPA and other regulations
"""
from datetime import timedelta

RETENTION_POLICIES = {
    # GDPR Compliant (EU) - Right to be forgotten
    'messages': {
        'default': timedelta(days=90),  # Regular messages
        'business': timedelta(days=365),  # Business records for accounting
        'deleted_by_user': timedelta(hours=24),  # Soft delete grace period
        'voice_notes': timedelta(days=30),  # Audio messages
        'images': timedelta(days=90)  # Image attachments
    },
    
    # CCPA Compliant (California Consumer Privacy Act)
    'personal_data': {
        'active_user': None,  # Keep while user is active
        'inactive_user': timedelta(days=365),  # Delete after 1 year inactive
        'deletion_request': timedelta(days=30),  # 30 days to process deletion
        'export_request': timedelta(days=45)  # 45 days to provide data export
    },
    
    # COPPA Compliant (Children's Online Privacy Protection)
    'minor_data': {
        'messages': timedelta(days=30),  # Shorter retention for minors
        'recordings': timedelta(days=0),  # Don't store recordings from minors
        'location': timedelta(days=0),  # Don't store location from minors
        'age_verification': timedelta(days=90)  # Keep age verification records
    },
    
    # Call and Recording Data
    'call_records': {
        'metadata': timedelta(days=365),  # Keep call logs for 1 year
        'recordings': timedelta(days=30),  # Delete recordings after 30 days
        'transcripts': timedelta(days=90),  # Keep transcripts longer
        'consent_records': timedelta(days=730)  # Keep consent for 2 years
    },
    
    # Financial and Tax Compliance (7 years in most jurisdictions)
    'financial': {
        'transactions': timedelta(days=2555),  # 7 years for tax purposes
        'invoices': timedelta(days=2555),  # 7 years
        'receipts': timedelta(days=2555),  # 7 years
        'payment_methods': timedelta(days=90)  # Delete expired cards after 90 days
    },
    
    # Authentication and Security
    'auth': {
        'sessions': timedelta(days=7),  # Clear old sessions weekly
        'otp_codes': timedelta(hours=1),  # Delete OTPs after 1 hour
        'failed_logins': timedelta(days=90),  # Keep for security analysis
        'password_reset_tokens': timedelta(hours=24)  # 24 hour validity
    },
    
    # Temporary Data
    'temporary': {
        'file_uploads': timedelta(hours=24),  # Temp uploads
        'export_files': timedelta(hours=48),  # Generated exports
        'cache_data': timedelta(hours=12),  # API cache
        'websocket_messages': timedelta(minutes=5)  # Undelivered messages
    },
    
    # Legal and Compliance
    'compliance': {
        'audit_logs': timedelta(days=2555),  # 7 years for legal
        'consent_logs': timedelta(days=730),  # 2 years
        'deletion_logs': timedelta(days=365),  # 1 year
        'access_logs': timedelta(days=180)  # 6 months
    }
}

# Regional Overrides (stricter rules for certain regions)
REGIONAL_OVERRIDES = {
    'EU': {  # European Union - GDPR
        'messages.default': timedelta(days=90),
        'personal_data.deletion_request': timedelta(days=30)
    },
    'CA': {  # California - CCPA
        'personal_data.deletion_request': timedelta(days=45),
        'personal_data.export_request': timedelta(days=45)
    },
    'UK': {  # United Kingdom - UK GDPR
        'messages.default': timedelta(days=90),
        'personal_data.deletion_request': timedelta(days=30)
    },
    'BR': {  # Brazil - LGPD
        'personal_data.deletion_request': timedelta(days=15),
        'messages.default': timedelta(days=60)
    },
    'IN': {  # India - DPDP
        'personal_data.deletion_request': timedelta(days=30),
        'financial.transactions': timedelta(days=2920)  # 8 years
    }
}

def get_retention_period(data_type, category, user_region=None):
    """
    Get the appropriate retention period for a data type
    considering regional regulations
    """
    base_period = RETENTION_POLICIES.get(data_type, {}).get(category)
    
    if user_region and user_region in REGIONAL_OVERRIDES:
        override_key = f"{data_type}.{category}"
        if override_key in REGIONAL_OVERRIDES[user_region]:
            return REGIONAL_OVERRIDES[user_region][override_key]
    
    return base_period

# Data categories that require explicit user consent
CONSENT_REQUIRED = [
    'call_records.recordings',
    'call_records.transcripts',
    'messages.voice_notes',
    'personal_data.location',
    'personal_data.biometric'
]

# Data that must be anonymized instead of deleted
ANONYMIZE_INSTEAD = [
    'financial.transactions',  # Keep for accounting but remove personal info
    'compliance.audit_logs',  # Keep for legal but anonymize user data
    'call_records.metadata'  # Keep stats but remove identifiers
]