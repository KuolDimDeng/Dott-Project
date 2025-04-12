#!/usr/bin/env python3
import boto3
import os
import sys
import json
import logging
import datetime
from botocore.exceptions import ClientError
from termcolor import colored

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cognito configuration
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', 'us-east-1_JPL8vGfb6')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

def get_all_users(pagination_token=None, limit=60):
    """
    Get all users from the Cognito user pool
    """
    try:
        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)
        
        # Parameters for listing users
        params = {
            'UserPoolId': COGNITO_USER_POOL_ID,
            'Limit': limit
        }
        
        # Add pagination token if provided
        if pagination_token:
            params['PaginationToken'] = pagination_token
        
        # List users
        response = cognito_client.list_users(**params)
        
        # Return users and pagination token
        return {
            'users': response.get('Users', []),
            'pagination_token': response.get('PaginationToken')
        }
    except ClientError as e:
        logger.error(f"Error listing users: {str(e)}")
        print(colored(f"Error listing users: {str(e)}", "red"))
        return {'users': [], 'pagination_token': None}

def get_user_details(username):
    """
    Get detailed information about a user in Cognito
    """
    try:
        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)
        
        # Get user details
        user_response = cognito_client.admin_get_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username
        )
        
        # Extract attributes
        attributes = {}
        for attr in user_response.get('UserAttributes', []):
            attributes[attr['Name']] = attr['Value']
        
        return {
            'username': user_response.get('Username'),
            'status': user_response.get('UserStatus'),
            'created_date': user_response.get('UserCreateDate'),
            'modified_date': user_response.get('UserLastModifiedDate'),
            'enabled': user_response.get('Enabled', True),
            'attributes': attributes
        }
    except ClientError as e:
        logger.error(f"Error getting user details for {username}: {str(e)}")
        return None

def update_user_attributes(username, attributes):
    """
    Update user attributes in Cognito
    """
    try:
        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)
        
        # Format attributes for Cognito API
        user_attributes = [
            {'Name': name, 'Value': value} 
            for name, value in attributes.items()
        ]
        
        # Update the user attributes
        response = cognito_client.admin_update_user_attributes(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
            UserAttributes=user_attributes
        )
        
        return True
    
    except ClientError as e:
        logger.error(f"Error updating attributes for {username}: {str(e)}")
        return False

def fix_free_plan_users():
    """
    Find and fix all users with free plans but incorrect onboarding status
    """
    print(colored("=== Finding users with free plans but incorrect onboarding status ===", "cyan"))
    
    pagination_token = None
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    while True:
        # Get batch of users
        result = get_all_users(pagination_token)
        users = result.get('users', [])
        pagination_token = result.get('pagination_token')
        
        if not users:
            break
        
        print(colored(f"\nProcessing batch of {len(users)} users...", "cyan"))
        
        # Process each user
        for user in users:
            username = user.get('Username')
            
            # Get user details
            user_details = get_user_details(username)
            if not user_details:
                error_count += 1
                continue
            
            # Get attributes
            attributes = user_details.get('attributes', {})
            
            # Check if user has FREE plan
            subscription_plan = attributes.get('custom:subplan', '').upper()
            onboarding_status = attributes.get('custom:onboarding', '')
            setup_done = attributes.get('custom:setupdone', '')
            
            # Skip if not a FREE plan
            if subscription_plan != 'free':
                skipped_count += 1
                continue
            
            # Skip if already properly set
            if onboarding_status == 'complete' and setup_done == 'true':
                skipped_count += 1
                continue
            
            # Found a user with FREE plan but incorrect onboarding status
            email = attributes.get('email', 'Unknown')
            
            print(colored(f"\nUser {email} has free plan but incorrect onboarding status:", "yellow"))
            print(f"  Onboarding status: {onboarding_status}")
            print(f"  Setup done: {setup_done}")
            
            # Update attributes
            attributes_to_update = {
                'custom:onboarding': 'complete',
                'custom:setupdone': 'true',
                'custom:updated_at': datetime.datetime.now().isoformat()
            }
            
            # Update the user
            success = update_user_attributes(username, attributes_to_update)
            
            if success:
                print(colored(f"  ✓ Fixed onboarding status for {email}", "green"))
                fixed_count += 1
            else:
                print(colored(f"  ✗ Failed to fix onboarding status for {email}", "red"))
                error_count += 1
        
        # Check if we need to continue pagination
        if not pagination_token:
            break
    
    # Summary
    print(colored("\n=== Summary ===", "cyan"))
    print(f"Fixed users: {fixed_count}")
    print(f"Skipped users: {skipped_count}")
    print(f"Errors: {error_count}")
    
    return fixed_count

def main():
    """
    Main function to run the script
    """
    print(colored("=== Fix Free Plan Onboarding Status ===", "cyan"))
    
    # Process all users
    fixed_count = fix_free_plan_users()
    
    if fixed_count > 0:
        print(colored(f"\nSuccessfully fixed {fixed_count} users", "green"))
    else:
        print(colored("\nNo users needed fixing", "yellow"))

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(colored("\nOperation cancelled by user", "yellow"))
        sys.exit(0)
    except Exception as e:
        print(colored(f"An unexpected error occurred: {str(e)}", "red"))
        logger.exception("Unexpected error")
        sys.exit(1) 