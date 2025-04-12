#!/usr/bin/env python3
import boto3
import os
import sys
import json
import logging
from botocore.exceptions import ClientError
from termcolor import colored

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cognito configuration
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', 'us-east-1_JPL8vGfb6')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

def update_user_onboarding_status(email, status='complete'):
    """
    Update a user's onboarding status in Cognito
    """
    try:
        # Initialize Cognito client
        cognito_client = boto3.client('cognito-idp', region_name=AWS_REGION)
        
        # Get current user attributes
        user_response = cognito_client.admin_get_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email
        )
        
        # Extract current attributes
        current_attributes = {}
        for attr in user_response.get('UserAttributes', []):
            current_attributes[attr['Name']] = attr['Value']
        
        # Check current onboarding status
        current_status = current_attributes.get('custom:onboarding', 'unknown')
        print(colored(f"Current onboarding status: {current_status}", "cyan"))
        
        if current_status == status:
            print(colored(f"Status already set to '{status}', no changes needed", "green"))
            return True
        
        # Update the onboarding status
        response = cognito_client.admin_update_user_attributes(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {'Name': 'custom:onboarding', 'Value': status},
                {'Name': 'custom:setupdone', 'Value': 'true'},
                {'Name': 'custom:updated_at', 'Value': import_module('datetime').datetime.now().isoformat()}
            ]
        )
        
        print(colored(f"Successfully updated onboarding status from '{current_status}' to '{status}'", "green"))
        return True
    
    except ClientError as e:
        logger.error(f"Error updating onboarding status: {str(e)}")
        print(colored(f"Error updating onboarding status: {str(e)}", "red"))
        return False

def import_module(name):
    """
    Import module by name
    """
    return __import__(name, globals(), locals(), ['*'])

def main():
    """
    Main function to run the script
    """
    print(colored("=== Cognito Onboarding Status Fix ===", "cyan"))
    
    # Get user email
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = input(colored("Enter the user's email address: ", "yellow"))
    
    # Get desired status
    if len(sys.argv) > 2:
        status = sys.argv[2]
    else:
        status = input(colored("Enter the desired onboarding status (default: complete): ", "yellow")) or "complete"
    
    # Update the status
    success = update_user_onboarding_status(email, status)
    
    if success:
        print(colored("\nOnboarding status updated successfully!", "green"))
    else:
        print(colored("\nFailed to update onboarding status. Check logs for details.", "red"))

if __name__ == "__main__":
    try:
        import datetime  # Import here to avoid issues with the import_module function
        main()
    except KeyboardInterrupt:
        print(colored("\nOperation cancelled by user", "yellow"))
        sys.exit(0)
    except Exception as e:
        print(colored(f"An unexpected error occurred: {str(e)}", "red"))
        logger.exception("Unexpected error")
        sys.exit(1) 