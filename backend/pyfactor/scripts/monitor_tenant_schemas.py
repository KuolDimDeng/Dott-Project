#!/usr/bin/env python
"""
Monitor tenant schemas and detect issues
Usage:
    python manage.py shell < scripts/monitor_tenant_schemas.py
"""

import os
import sys
import json
import uuid
import datetime
from django.db import connection
from custom_auth.models import User, Tenant
from django.conf import settings
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Set up logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='tenant_monitoring.log', 
    filemode='a'
)
logger = logging.getLogger(__name__)

# Configuration
EMAIL_FROM = settings.EMAIL_HOST_USER if hasattr(settings, 'EMAIL_HOST_USER') else os.environ.get('EMAIL_HOST_USER')
EMAIL_TO = os.environ.get('ALERT_EMAIL', 'admin@example.com')
ALERT_THRESHOLD = 3  # Number of users without schemas before alerting

def send_email_alert(subject, message):
    """Send email alert to administrators"""
    try:
        if not EMAIL_FROM:
            logger.error("EMAIL_FROM not configured. Skipping email alert.")
            return False
            
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = EMAIL_TO
        msg['Subject'] = subject
        
        msg.attach(MIMEText(message, 'plain'))
        
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Alert email sent to {EMAIL_TO}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email alert: {str(e)}")
        return False

def check_users_without_schemas():
    """Check for users who should have schemas but don't"""
    issues = []
    
    # Get all owner users with tenant_id
    users = User.objects.filter(role='OWNER', tenant_id__isnull=False)
    logger.info(f"Found {users.count()} owner users with tenant_id")
    
    for user in users:
        try:
            # Get tenant
            tenant = Tenant.objects.filter(id=user.tenant_id).first()
            if not tenant:
                issues.append({
                    'user_id': str(user.id),
                    'email': user.email,
                    'tenant_id': str(user.tenant_id) if user.tenant_id else None,
                    'issue': 'Tenant record not found',
                })
                continue
                
            # Check if schema exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.schemata 
                        WHERE schema_name = %s
                    )
                """, [tenant.schema_name])
                
                schema_exists = cursor.fetchone()[0]
                
                if not schema_exists:
                    issues.append({
                        'user_id': str(user.id),
                        'email': user.email,
                        'tenant_id': str(tenant.id),
                        'schema_name': tenant.schema_name,
                        'issue': 'Schema does not exist',
                    })
                else:
                    # Check if auth tables exist
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = %s AND table_name = 'custom_auth_user'
                        )
                    """, [tenant.schema_name])
                    
                    tables_exist = cursor.fetchone()[0]
                    
                    if not tables_exist:
                        issues.append({
                            'user_id': str(user.id),
                            'email': user.email,
                            'tenant_id': str(tenant.id),
                            'schema_name': tenant.schema_name,
                            'issue': 'Auth tables missing from schema',
                        })
        except Exception as e:
            logger.error(f"Error checking user {user.email}: {str(e)}")
            issues.append({
                'user_id': str(user.id),
                'email': user.email,
                'tenant_id': str(user.tenant_id) if user.tenant_id else None,
                'issue': f'Error: {str(e)}',
            })
    
    return issues

def check_schemas_without_tenants():
    """Check for schemas without corresponding tenant records"""
    issues = []
    
    # Get all tenant schemas
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE 'tenant_%'
            ORDER BY schema_name
        """)
        
        schemas = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found {len(schemas)} tenant schemas")
        
        for schema_name in schemas:
            # Extract tenant ID from schema name
            try:
                tenant_id_str = schema_name[7:].replace('_', '-')
                tenant_id = uuid.UUID(tenant_id_str)
                
                # Check if tenant record exists
                tenant = Tenant.objects.filter(id=tenant_id).first()
                if not tenant:
                    issues.append({
                        'schema_name': schema_name,
                        'tenant_id': str(tenant_id),
                        'issue': 'No tenant record exists for schema',
                    })
            except ValueError:
                issues.append({
                    'schema_name': schema_name,
                    'issue': 'Invalid schema name format',
                })
    
    return issues

def run_monitoring():
    """Run tenant schema monitoring checks"""
    logger.info("Starting tenant schema monitoring")
    
    # Check users without schemas
    user_issues = check_users_without_schemas()
    
    # Check schemas without tenants
    schema_issues = check_schemas_without_tenants()
    
    # Combine all issues
    all_issues = {
        'timestamp': datetime.datetime.now().isoformat(),
        'user_issues': user_issues,
        'schema_issues': schema_issues,
        'total_issues': len(user_issues) + len(schema_issues)
    }
    
    # Log results
    logger.info(f"Monitoring completed. Found {all_issues['total_issues']} issues.")
    
    # Save results to file
    with open('tenant_monitoring_results.json', 'w') as f:
        json.dump(all_issues, f, indent=2)
    
    # Send alert if issues exceed threshold
    if all_issues['total_issues'] >= ALERT_THRESHOLD:
        subject = f"ALERT: {all_issues['total_issues']} tenant schema issues detected"
        message = f"""
Tenant Schema Monitoring Alert

Timestamp: {all_issues['timestamp']}
Total Issues: {all_issues['total_issues']}

Users with Schema Issues: {len(user_issues)}
Schemas without Tenant Records: {len(schema_issues)}

See tenant_monitoring_results.json for details.
"""
        send_email_alert(subject, message)

if __name__ == "__main__":
    run_monitoring()