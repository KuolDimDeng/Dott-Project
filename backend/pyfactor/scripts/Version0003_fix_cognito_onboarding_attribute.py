#!/usr/bin/env python
"""
Version0003_fix_cognito_onboarding_attribute.py

Description: Server-side script to fix Cognito onboarding attribute issues
Version: 1.0
Author: System Administrator
Date: 2025-04-29

This script addresses the server-side component of the dashboard rerendering issue
by ensuring the backend properly handles and sets the custom:onboarding attribute
in Cognito when a user completes the subscription process.

The script:
1. Adds proper error handling when updating Cognito attributes
2. Ensures the custom:onboarding attribute is set correctly after subscription
3. Provides a utility function to check and fix the attribute for existing users

Usage:
    python Version0003_fix_cognito_onboarding_attribute.py
"""

import os
import sys
import json
import logging
import boto3
import time
from datetime import datetime
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"cognito_onboarding_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
    ]
)
logger = logging.getLogger("CognitoOnboardingFix")

# Script metadata
SCRIPT_VERSION = "0003"
SCRIPT_DESCRIPTION = "Fix Cognito onboarding attribute issues"

def get_cognito_client():
    """
    Initialize and return a Cognito Identity Provider client
    """
    try:
        # Try to get credentials from environment
        region = os.environ.get('AWS_REGION', 'us-east-1')
        
        # Initialize Cognito client
        return boto3.client('cognito-idp', region_name=region)
    except Exception as e:
        logger.error(f"Error initializing Cognito client: {str(e)}")
        raise

def get_user_pool_id():
    """
    Get the Cognito User Pool ID from environment variables
    """
    user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')
    if not user_pool_id:
        logger.error("COGNITO_USER_POOL_ID environment variable not set")
        raise ValueError("COGNITO_USER_POOL_ID environment variable not set")
    return user_pool_id

def update_user_attribute(username, attribute_name, attribute_value):
    """
    Update a single Cognito user attribute
    
    Args:
        username (str): The username (usually the email) of the user
        attribute_name (str): The name of the attribute to update
        attribute_value (str): The value to set for the attribute
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    try:
        logger.info(f"Updating attribute {attribute_name} for user {username}")
        client = get_cognito_client()
        user_pool_id = get_user_pool_id()
        
        response = client.admin_update_user_attributes(
            UserPoolId=user_pool_id,
            Username=username,
            UserAttributes=[
                {
                    'Name': attribute_name,
                    'Value': attribute_value
                },
            ]
        )
        
        logger.info(f"Successfully updated attribute {attribute_name} for user {username}")
        return True
    except ClientError as e:
        logger.error(f"Cognito client error updating attribute {attribute_name} for user {username}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error updating attribute {attribute_name} for user {username}: {str(e)}")
        return False

def get_user_attributes(username):
    """
    Get all attributes for a Cognito user
    
    Args:
        username (str): The username (usually the email) of the user
        
    Returns:
        dict: A dictionary of user attributes, or None if there was an error
    """
    try:
        logger.info(f"Getting attributes for user {username}")
        client = get_cognito_client()
        user_pool_id = get_user_pool_id()
        
        response = client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        # Convert from Cognito format to dictionary
        attributes = {}
        for attr in response.get('UserAttributes', []):
            attributes[attr['Name']] = attr['Value']
        
        return attributes
    except ClientError as e:
        logger.error(f"Cognito client error getting attributes for user {username}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error getting attributes for user {username}: {str(e)}")
        return None

def fix_onboarding_attribute(username):
    """
    Check and fix the onboarding attribute for a user
    
    Args:
        username (str): The username (usually the email) of the user
        
    Returns:
        bool: True if the attribute was fixed or already correct, False if there was an error
    """
    try:
        logger.info(f"Checking onboarding attribute for user {username}")
        
        # Get current attributes
        attributes = get_user_attributes(username)
        if not attributes:
            logger.error(f"Could not get attributes for user {username}")
            return False
        
        # Check if onboarding is already complete
        onboarding_status = attributes.get('custom:onboarding', '')
        if onboarding_status == 'complete':
            logger.info(f"Onboarding already complete for user {username}")
            return True
        
        # Check if user has a tenant ID, which indicates they've gone through subscription
        tenant_id = attributes.get('custom:tenant_ID', '') or attributes.get('custom:businessid', '')
        if not tenant_id:
            logger.info(f"User {username} has no tenant ID yet, skipping onboarding fix")
            return False
        
        # Update the onboarding attribute
        result = update_user_attribute(username, 'custom:onboarding', 'complete')
        if result:
            # Also update the setupdone attribute for consistency
            update_user_attribute(username, 'custom:setupdone', 'true')
            logger.info(f"Successfully fixed onboarding attribute for user {username}")
            return True
        else:
            logger.error(f"Failed to fix onboarding attribute for user {username}")
            return False
    except Exception as e:
        logger.error(f"Error fixing onboarding attribute for user {username}: {str(e)}")
        return False

def fix_all_users_onboarding():
    """
    Find and fix onboarding attributes for all users with incomplete onboarding
    but who have a tenant ID (indicating they've gone through subscription)
    
    Returns:
        tuple: (total_users, fixed_count, error_count)
    """
    try:
        logger.info("Starting to fix onboarding attributes for all users")
        client = get_cognito_client()
        user_pool_id = get_user_pool_id()
        
        # Get all users from the user pool
        users = []
        pagination_token = None
        
        while True:
            if pagination_token:
                response = client.list_users(
                    UserPoolId=user_pool_id,
                    PaginationToken=pagination_token
                )
            else:
                response = client.list_users(
                    UserPoolId=user_pool_id
                )
            
            users.extend(response.get('Users', []))
            
            pagination_token = response.get('PaginationToken')
            if not pagination_token:
                break
        
        logger.info(f"Found {len(users)} users in the user pool")
        
        # Process each user
        fixed_count = 0
        error_count = 0
        
        for user in users:
            username = user.get('Username')
            
            # Convert user attributes to dictionary
            attributes = {}
            for attr in user.get('Attributes', []):
                attributes[attr['Name']] = attr['Value']
            
            # Check if user needs fixing (has tenant ID but not completed onboarding)
            tenant_id = attributes.get('custom:tenant_ID', '') or attributes.get('custom:businessid', '')
            onboarding_status = attributes.get('custom:onboarding', '')
            
            if tenant_id and onboarding_status != 'complete':
                logger.info(f"User {username} has tenant ID but incomplete onboarding, fixing...")
                
                if fix_onboarding_attribute(username):
                    fixed_count += 1
                else:
                    error_count += 1
            
            # Add a small delay to avoid rate limiting
            time.sleep(0.1)
        
        logger.info(f"Completed fixing onboarding attributes. Fixed: {fixed_count}, Errors: {error_count}")
        return len(users), fixed_count, error_count
    
    except Exception as e:
        logger.error(f"Error fixing all users' onboarding attributes: {str(e)}")
        return 0, 0, 0

def main():
    """
    Main entry point for the script
    """
    logger.info(f"Starting Cognito Onboarding Fix Script v{SCRIPT_VERSION}")
    logger.info(f"Description: {SCRIPT_DESCRIPTION}")
    
    try:
        # Fix onboarding attributes for all users
        total_users, fixed_count, error_count = fix_all_users_onboarding()
        
        logger.info(f"Script executed successfully")
        logger.info(f"Total users processed: {total_users}")
        logger.info(f"Users fixed: {fixed_count}")
        logger.info(f"Errors encountered: {error_count}")
        
        # Return a success status
        return 0
    except Exception as e:
        logger.error(f"Script execution failed: {str(e)}")
        # Return a failure status
        return 1

if __name__ == "__main__":
    sys.exit(main()) 