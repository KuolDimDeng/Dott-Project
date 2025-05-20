#!/usr/bin/env python
"""
Update cognito_sub field for users
Usage:
    python manage.py shell < scripts/update_cognito_sub.py
"""

import boto3
import os
from django.conf import settings
from custom_auth.models import User

# Configure AWS
AWS_REGION = settings.AWS_REGION if hasattr(settings, 'AWS_REGION') else os.environ.get('AWS_REGION', 'us-east-1')
USER_POOL_ID = settings.COGNITO_USER_POOL_ID if hasattr(settings, 'COGNITO_USER_POOL_ID') else os.environ.get('COGNITO_USER_POOL_ID')

# Setup Cognito client
cognito = boto3.client('cognito-idp', region_name=AWS_REGION)

def update_cognito_sub():
    """Update cognito_sub for all users where it's None"""
    print(f"Using User Pool ID: {USER_POOL_ID}")
    print(f"Using AWS Region: {AWS_REGION}")
    
    # Get users with missing cognito_sub
    users_missing_sub = User.objects.filter(cognito_sub__isnull=True)
    print(f"Found {users_missing_sub.count()} users with missing cognito_sub")
    
    updated_count = 0
    error_count = 0
    
    for user in users_missing_sub:
        try:
            # Query Cognito for this user by email
            response = cognito.list_users(
                UserPoolId=USER_POOL_ID,
                Filter=f'email="{user.email}"'
            )
            
            # Check if we found the user
            if response['Users'] and len(response['Users']) > 0:
                cognito_user = response['Users'][0]
                cognito_sub = cognito_user['Username']
                
                # Update the user record
                user.cognito_sub = cognito_sub
                user.save(update_fields=['cognito_sub'])
                updated_count += 1
                
                print(f"Updated user {user.email} with cognito_sub: {cognito_sub}")
            else:
                print(f"No Cognito user found for email: {user.email}")
                error_count += 1
        except Exception as e:
            print(f"Error updating user {user.email}: {str(e)}")
            error_count += 1
    
    print(f"Update completed. Updated {updated_count} users. Errors: {error_count}")

# Run the update function
if __name__ == "__main__":
    update_cognito_sub() 