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

def get_user_details(email):
    """
    Get detailed information about a user in Cognito
    """
    try:
        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)
        
        # Get user details
        user_response = cognito_client.admin_get_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email
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
        logger.error(f"Error getting user details: {str(e)}")
        print(colored(f"Error getting user details: {str(e)}", "red"))
        return None

def update_user_attributes(email, attributes):
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
            Username=email,
            UserAttributes=user_attributes
        )
        
        print(colored(f"Successfully updated user attributes", "green"))
        return True
    
    except ClientError as e:
        logger.error(f"Error updating user attributes: {str(e)}")
        print(colored(f"Error updating user attributes: {str(e)}", "red"))
        return False

def set_onboarding_complete(email):
    """
    Set a user's onboarding status to complete
    """
    # Get current user details
    user_details = get_user_details(email)
    if not user_details:
        print(colored("\nFailed to retrieve user details", "red"))
        return False
    
    # Display current user information
    print(colored("\nCurrent User Details:", "cyan"))
    print(f"Username: {user_details['username']}")
    print(f"Status: {user_details['status']}")
    print(f"Created: {user_details['created_date']}")
    print(f"Last Modified: {user_details['modified_date']}")
    print(f"Enabled: {user_details['enabled']}")
    
    print(colored("\nCurrent Attributes:", "cyan"))
    for name, value in user_details['attributes'].items():
        if name.startswith('custom:'):
            print(f"{name}: {value}")
    
    # Check current onboarding status
    current_status = user_details['attributes'].get('custom:onboarding', 'unknown')
    if current_status == 'complete':
        print(colored("\nOnboarding status already set to 'complete', no changes needed", "green"))
        return True
    
    # Update attributes
    attributes_to_update = {
        'custom:onboarding': 'complete',
        'custom:setupdone': 'true',
        'custom:updated_at': datetime.datetime.now().isoformat()
    }
    
    # Check if plan is free
    subscription_plan = user_details['attributes'].get('custom:subplan', '').upper()
    if subscription_plan == 'free':
        print(colored(f"\nDetected free plan. Setting onboarding to 'complete'", "yellow"))
    else:
        print(colored(f"\nWarning: User has {subscription_plan} plan. Setting onboarding to 'complete' anyway.", "yellow"))
        confirm = input(colored("Continue? (y/n): ", "yellow")).strip().lower()
        if confirm != 'y':
            print(colored("Operation cancelled", "yellow"))
            return False
    
    # Update the attributes
    success = update_user_attributes(email, attributes_to_update)
    
    if success:
        # Verify the update
        updated_user = get_user_details(email)
        if updated_user is None:
            print(colored(f"\nWarning: Could not verify update status", "yellow"))
            return success
            
        new_status = updated_user['attributes'].get('custom:onboarding', 'unknown')
        
        if new_status == 'complete':
            print(colored(f"\nVerified: Onboarding status successfully updated to '{new_status}'", "green"))
        else:
            print(colored(f"\nWarning: Status verification failed. Current status: '{new_status}'", "yellow"))
    
    return success

def main():
    """
    Main function to run the script
    """
    print(colored("=== Cognito Onboarding Status Fix Tool ===", "cyan"))
    
    # Get user email
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = input(colored("Enter the user's email address: ", "yellow"))
    
    # Fix the onboarding status
    success = set_onboarding_complete(email)
    
    if success:
        print(colored("\nOperation completed successfully!", "green"))
    else:
        print(colored("\nOperation failed. Check logs for details.", "red"))

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