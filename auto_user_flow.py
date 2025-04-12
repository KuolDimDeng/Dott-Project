#!/usr/bin/env python
"""
Automated User Flow Script

This script automates the user signup, email verification, signin, and onboarding process 
through terminal inputs, then opens the dashboard in the browser at the end.

Usage:
    python auto_user_flow.py
"""

import os
import sys
import json
import uuid
import time
import random
import string
import logging
import requests
import webbrowser
from dotenv import load_dotenv
import boto3
import datetime
from botocore.exceptions import ClientError
from getpass import getpass
from termcolor import colored

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# First, try to load from backend env file
backend_env_path = os.path.join(os.getcwd(), 'backend', 'pyfactor', '.env')
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path)
    logger.info(f"Loaded environment variables from {backend_env_path}")

# AWS Cognito configuration
AWS_REGION = os.getenv('AWS_DEFAULT_REGION') or os.getenv('AWS_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.getenv('AWS_COGNITO_USER_POOL_ID') or os.getenv('COGNITO_USER_POOL_ID')
COGNITO_APP_CLIENT_ID = os.getenv('AWS_COGNITO_CLIENT_ID') or os.getenv('COGNITO_APP_CLIENT_ID')

# Check if credentials are placeholders and clear them if they are
if os.getenv('AWS_ACCESS_KEY_ID') == 'placeholder_aws_key':
    os.environ.pop('AWS_ACCESS_KEY_ID', None)
    logger.warning("Removed placeholder AWS Access Key ID")

if os.getenv('AWS_SECRET_ACCESS_KEY') == 'placeholder_aws_secret':
    os.environ.pop('AWS_SECRET_ACCESS_KEY', None)
    logger.warning("Removed placeholder AWS Secret Access Key")

# Backend API configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')

# Frontend configuration 
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

class UserFlowAutomation:
    def __init__(self):
        """Initialize the automation class"""
        # Initialize AWS clients with credential provider chain
        self.init_aws_client()
        
        # User state
        self.user_email = None
        self.user_password = None
        self.user_name = None
        self.business_name = None
        self.business_type = None
        self.business_country = None
        self.business_id = None
        self.tenant_id = None
        self.tenant_schema = None
        self.id_token = None
        self.access_token = None
        self.refresh_token = None
    
    def init_aws_client(self):
        """Initialize AWS client with default credential chain and fallback to manual input if needed"""
        # Check for required Cognito configuration
        if not COGNITO_USER_POOL_ID or not COGNITO_APP_CLIENT_ID:
            logger.error("Missing required Cognito configuration")
            print(colored("Missing required Cognito configuration:", "red"))
            if not COGNITO_USER_POOL_ID:
                print("- Cognito User Pool ID")
            if not COGNITO_APP_CLIENT_ID:
                print("- Cognito App Client ID")
            sys.exit(1)
        
        # First try: Use default credential provider chain
        try:
            logger.info("Creating AWS Cognito client with default credential provider chain")
            self.cognito_client = boto3.client(
                'cognito-idp',
                region_name=AWS_REGION
            )
            # Test the client with a simple operation
            self.cognito_client.list_user_pools(MaxResults=1)
            logger.info("Successfully connected to AWS Cognito")
            print(colored("AWS Cognito client initialized successfully", "green"))
            return
        except Exception as e:
            logger.warning(f"Failed to connect using default credential chain: {e}")
            print(colored("Failed to connect using default AWS credentials", "yellow"))
        
        # Second try: Use AWS profiles
        try:
            logger.info("Trying to use AWS profiles")
            session = boto3.Session(profile_name='default')
            self.cognito_client = session.client('cognito-idp', region_name=AWS_REGION)
            self.cognito_client.list_user_pools(MaxResults=1)
            logger.info("Successfully connected to AWS Cognito using AWS profile")
            print(colored("AWS Cognito client initialized successfully using AWS profile", "green"))
            return
        except Exception as e:
            logger.warning(f"Failed to connect using AWS profile: {e}")
            print(colored("Could not connect using AWS profile", "yellow"))
        
        # Third try: Manual credential entry
        print(colored("\nAWS credentials not found or invalid. Please enter them manually:", "yellow"))
        retry = True
        
        while retry:
            access_key = input(colored("Enter AWS Access Key ID: ", "green")).strip()
            secret_key = getpass(colored("Enter AWS Secret Access Key: ", "green"))
            
            try:
                self.cognito_client = boto3.client(
                    'cognito-idp',
                    region_name=AWS_REGION,
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key
                )
                # Test connection
                self.cognito_client.list_user_pools(MaxResults=1)
                logger.info("Successfully connected to AWS Cognito with manual credentials")
                print(colored("AWS Cognito client initialized successfully", "green"))
                
                # Save credentials for future script runs?
                save_creds = input(colored("Save these credentials for future runs? (y/n): ", "yellow")).strip().lower() == 'y'
                if save_creds:
                    # Create ~/.aws directory if it doesn't exist
                    aws_dir = os.path.expanduser("~/.aws")
                    if not os.path.exists(aws_dir):
                        os.makedirs(aws_dir)
                    
                    # Write credentials to file
                    with open(os.path.join(aws_dir, "credentials"), "w") as f:
                        f.write("[default]\n")
                        f.write(f"aws_access_key_id = {access_key}\n")
                        f.write(f"aws_secret_access_key = {secret_key}\n")
                        f.write(f"region = {AWS_REGION}\n")
                    
                    print(colored("Credentials saved to ~/.aws/credentials", "green"))
                
                # Exit the retry loop
                retry = False
            except Exception as e:
                logger.error(f"Connection error with provided credentials: {e}")
                print(colored(f"Connection error: {str(e)}", "red"))
                retry = input(colored("Retry with different credentials? (y/n): ", "yellow")).strip().lower() == 'y'
                if not retry:
                    logger.error("Exiting due to authentication failure")
                    sys.exit(1)
        
        # Print Cognito configuration
        print(colored("\n===== AWS Cognito Configuration =====", "cyan"))
        print(f"Region: {AWS_REGION}")
        print(f"User Pool ID: {COGNITO_USER_POOL_ID}")
        print(f"App Client ID: {COGNITO_APP_CLIENT_ID}")
    
    def generate_password(self, length=12):
        """Generate a strong random password"""
        chars = string.ascii_letters + string.digits + "!@#$%^&*()"
        password = ''.join(random.choice(chars) for _ in range(length))
        
        # Ensure password meets Cognito requirements
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()" for c in password)
        
        if not (has_upper and has_lower and has_digit and has_special):
            return self.generate_password(length)
            
        return password
    
    def get_user_input(self):
        """Gather user input for the signup and onboarding process"""
        print(colored("\n===== User Signup Information =====", "cyan"))
        
        # Get user email
        self.user_email = input(colored("Enter email address: ", "green")).strip()
        
        # Generate or get password
        use_generated = input(colored("Generate a random password? (y/n): ", "green")).strip().lower() == 'y'
        if use_generated:
            self.user_password = self.generate_password()
            print(colored(f"Generated password: {self.user_password}", "yellow"))
        else:
            while True:
                password = getpass(colored("Enter password (min 8 chars, must include uppercase, lowercase, number, special char): ", "green"))
                if len(password) >= 8:
                    self.user_password = password
                    break
                print(colored("Password too short. Must be at least 8 characters.", "red"))
        
        # Get user name
        self.user_name = input(colored("Enter your full name: ", "green")).strip()
        first_name, *last_name_parts = self.user_name.split()
        self.first_name = first_name
        self.last_name = " ".join(last_name_parts) if last_name_parts else ""
        
        # Generate unique business ID (used for tenant)
        self.business_id = str(uuid.uuid4())
        
        print(colored("\n===== Business Information =====", "cyan"))
        
        # Get business name, auto-generate other fields
        self.business_name = input(colored("Enter business name: ", "green")).strip()
        
        # Default values for other business fields
        self.business_type = "RETAIL"  # Default business type
        self.business_country = "US"   # Default country code
        self.legal_structure = "LLC"   # Default legal structure
        
        # Use current date for date founded
        today = datetime.date.today()
        self.date_founded = today.strftime("%Y-%m-%d")
        
        # Print summary of collected information
        print(colored("\n===== Summary =====", "cyan"))
        print(f"Email: {self.user_email}")
        print(f"Name: {self.user_name}")
        print(f"Business: {self.business_name}")
        print(f"Business Type: {self.business_type} (auto-selected)")
        print(f"Business Country: {self.business_country} (auto-selected)")
        print(f"Legal Structure: {self.legal_structure} (auto-selected)")
        print(f"Date Founded: {self.date_founded} (today's date)")
        print(f"Business ID: {self.business_id}")
        
        confirm = input(colored("\nContinue with this information? (y/n): ", "yellow")).strip().lower() == 'y'
        if not confirm:
            print(colored("Aborting operation.", "red"))
            sys.exit(0)
    
    def signup_user(self):
        """Sign up a new user using Cognito"""
        print(colored("\n===== Starting User Signup =====", "cyan"))
        
        try:
            # Create user attributes
            user_attributes = [
                {'Name': 'email', 'Value': self.user_email},
                {'Name': 'custom:businessid', 'Value': self.business_id},
                {'Name': 'name', 'Value': self.user_name}
            ]
            
            if self.first_name:
                user_attributes.append({'Name': 'given_name', 'Value': self.first_name})
            
            if self.last_name:
                user_attributes.append({'Name': 'family_name', 'Value': self.last_name})
            
            # Sign up using Cognito
            response = self.cognito_client.sign_up(
                ClientId=COGNITO_APP_CLIENT_ID,
                Username=self.user_email,
                Password=self.user_password,
                UserAttributes=user_attributes
            )
            
            logger.info(f"User successfully signed up: {self.user_email}")
            print(colored(f"User successfully signed up: {self.user_email}", "green"))
            
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            if error_code == 'UsernameExistsException':
                logger.error(f"User already exists: {self.user_email}")
                print(colored(f"User already exists: {self.user_email}", "red"))
                
                # Ask if user wants to proceed with signin instead
                proceed = input(colored("Do you want to proceed with signin instead? (y/n): ", "yellow")).strip().lower() == 'y'
                if proceed:
                    return {'UserConfirmed': True, 'UserSub': 'existing_user'}
                else:
                    sys.exit(1)
            else:
                logger.error(f"Signup error ({error_code}): {error_message}")
                print(colored(f"Signup error: {error_message}", "red"))
                sys.exit(1)
    
    def verify_user_email(self, signup_response):
        """Verify user email by admin confirmation or code input"""
        print(colored("\n===== Email Verification =====", "cyan"))
        
        if signup_response['UserConfirmed']:
            print(colored("User is already confirmed.", "green"))
            return True
        
        # For new users, we can either:
        # 1. Use admin confirmation (automatic)
        # 2. Ask for verification code (manual)
        
        verification_method = input(colored("Verify via (1) Admin auto-verification or (2) Verification code? Enter 1 or 2: ", "green")).strip()
        
        if verification_method == "1":
            try:
                # Admin confirmation (bypasses email verification)
                self.cognito_client.admin_confirm_sign_up(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=self.user_email
                )
                
                print(colored(f"User verified via admin confirmation: {self.user_email}", "green"))
                return True
                
            except ClientError as e:
                logger.error(f"Admin verification error: {str(e)}")
                print(colored(f"Admin verification error: {str(e)}", "red"))
                
                # Fall back to manual verification
                print(colored("Falling back to manual verification code entry...", "yellow"))
                verification_method = "2"
        
        if verification_method == "2":
            # Manual verification code entry
            verification_code = input(colored("Enter the verification code sent to your email: ", "green")).strip()
            
            try:
                self.cognito_client.confirm_sign_up(
                    ClientId=COGNITO_APP_CLIENT_ID,
                    Username=self.user_email,
                    ConfirmationCode=verification_code
                )
                
                print(colored(f"User verified with code: {self.user_email}", "green"))
                return True
                
            except ClientError as e:
                logger.error(f"Verification error: {str(e)}")
                print(colored(f"Verification error: {str(e)}", "red"))
                
                retry = input(colored("Retry verification? (y/n): ", "yellow")).strip().lower() == 'y'
                if retry:
                    return self.verify_user_email(signup_response)
                else:
                    sys.exit(1)
        else:
            print(colored("Invalid verification method selected.", "red"))
            return self.verify_user_email(signup_response)
    
    def signin_user(self):
        """Sign in the user using Cognito"""
        print(colored("\n===== User Sign In =====", "cyan"))
        
        try:
            # Initiate auth
            response = self.cognito_client.initiate_auth(
                ClientId=COGNITO_APP_CLIENT_ID,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': self.user_email,
                    'PASSWORD': self.user_password
                }
            )
            
            # Extract tokens
            if 'AuthenticationResult' in response:
                auth_result = response['AuthenticationResult']
                self.id_token = auth_result.get('IdToken')
                self.access_token = auth_result.get('AccessToken')
                self.refresh_token = auth_result.get('RefreshToken')
                
                print(colored("User successfully signed in", "green"))
                return response
            else:
                print(colored("Authentication challenge required", "yellow"))
                return None
            
        except ClientError as e:
            logger.error(f"Signin error: {str(e)}")
            print(colored(f"Signin error: {str(e)}", "red"))
            
            retry = input(colored("Retry signin? (y/n): ", "yellow")).strip().lower() == 'y'
            if retry:
                return self.signin_user()
            else:
                sys.exit(1)
    
    def complete_business_info(self):
        """Complete the business info step of onboarding"""
        print(colored("\n===== Completing Business Info Step =====", "cyan"))
        
        try:
            # Update business info through Cognito attributes
            self.cognito_client.admin_update_user_attributes(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=self.user_email,
                UserAttributes=[
                    {'Name': 'custom:businessname', 'Value': self.business_name},
                    {'Name': 'custom:businesstype', 'Value': self.business_type},
                    {'Name': 'custom:businesscountry', 'Value': self.business_country},
                    {'Name': 'custom:legalstructure', 'Value': self.legal_structure},
                    {'Name': 'custom:datefounded', 'Value': self.date_founded},
                    {'Name': 'custom:onboarding', 'Value': 'business_info'}  # Match model: business_info
                ]
            )
            
            logger.info(f"Updated Cognito attributes for business info")
            print(colored("Business info updated successfully in Cognito", "green"))
            return True
                
        except Exception as e:
            logger.error(f"Error updating business info: {str(e)}")
            print(colored(f"Error updating business info: {str(e)}", "red"))
            return False
    
    def complete_subscription_step(self):
        """Complete the subscription step of onboarding"""
        print(colored("\n===== Completing Subscription Step =====", "cyan"))
        
        # Show subscription options and auto-select FREE plan
        print(colored("Available subscription plans:", "cyan"))
        print("1. free - Basic features")
        print("2. PROFESSIONAL - Advanced features")
        print("3. ENTERPRISE - All features + premium support")
        
        subscription_plan = "free"  # Default to free plan
        interval = "MONTHLY"        # Default to MONTHLY
        
        # Allow option to change from defaults
        change_defaults = input(colored("Use default plan (free/MONTHLY)? (y/n): ", "yellow")).strip().lower() == 'n'
        
        if change_defaults:
            plan_choice = input(colored("Select plan (1=free, 2=PROFESSIONAL, 3=ENTERPRISE): ", "green")).strip()
            if plan_choice == "2":
                subscription_plan = "PROFESSIONAL"
            elif plan_choice == "3":
                subscription_plan = "ENTERPRISE"
            
            interval_choice = input(colored("Select billing interval (1=MONTHLY, 2=ANNUAL): ", "green")).strip()
            if interval_choice == "2":
                interval = "ANNUAL"
        
        print(colored(f"Selected plan: {subscription_plan}/{interval}", "green"))
        
        try:
            # For FREE plan, directly complete the onboarding process
            if subscription_plan == "free":
                self.cognito_client.admin_update_user_attributes(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=self.user_email,
                    UserAttributes=[
                        {'Name': 'custom:subplan', 'Value': subscription_plan},
                        {'Name': 'custom:subscriptioninterval', 'Value': interval},
                        {'Name': 'custom:onboarding', 'Value': 'complete'},  # Always lowercase
                        {'Name': 'custom:setupdone', 'Value': 'true'}
                    ]
                )
                logger.info(f"Updated Cognito attributes for free plan, setting onboarding to complete")
                print(colored("free plan selected. Onboarding marked as complete.", "green"))
            else:
                # For paid plans, follow regular flow
                self.cognito_client.admin_update_user_attributes(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=self.user_email,
                    UserAttributes=[
                        {'Name': 'custom:subplan', 'Value': subscription_plan},
                        {'Name': 'custom:subscriptioninterval', 'Value': interval},
                        {'Name': 'custom:onboarding', 'Value': 'subscription'}  # Always lowercase
                    ]
                )
                logger.info(f"Updated Cognito attributes for subscription: {subscription_plan}/{interval}")
                print(colored("Subscription info updated successfully in Cognito", "green"))
            
            # Return subscription details
            return {
                'plan': subscription_plan,
                'interval': interval
            }
                
        except Exception as e:
            logger.error(f"Error updating subscription info: {str(e)}")
            print(colored(f"Error updating subscription info: {str(e)}", "red"))
            return False
    
    def complete_payment_step(self):
        """Complete the payment step of onboarding"""
        print(colored("\n===== Completing Payment Step =====", "cyan"))
        
        # Generate a simulated payment ID
        payment_id = f"sim-payment-{uuid.uuid4()}"
        print(colored(f"Simulating payment verification with ID: {payment_id}", "yellow"))
        
        try:
            # Update payment info through Cognito attributes
            self.cognito_client.admin_update_user_attributes(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=self.user_email,
                UserAttributes=[
                    {'Name': 'custom:paymentid', 'Value': payment_id},
                    {'Name': 'custom:payverified', 'Value': 'true'},
                    {'Name': 'custom:onboarding', 'Value': 'payment'}  # Always lowercase
                ]
            )
            
            logger.info(f"Updated Cognito attributes for payment: {payment_id}")
            print(colored("Payment info updated successfully in Cognito", "green"))
            return True
                
        except Exception as e:
            logger.error(f"Error updating payment info: {str(e)}")
            print(colored(f"Error updating payment info: {str(e)}", "red"))
            return False
    
    def complete_setup_step(self):
        """Complete the setup step of onboarding"""
        print(colored("\n===== Completing Setup Step =====", "cyan"))
        
        try:
            # Update setup status through Cognito attributes
            self.cognito_client.admin_update_user_attributes(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=self.user_email,
                UserAttributes=[
                    {'Name': 'custom:onboarding', 'Value': 'setup'}  # Always lowercase
                ]
            )
            
            logger.info("Updated Cognito attributes for setup step")
            print(colored("Setup step completed successfully in Cognito", "green"))
            return True
                
        except Exception as e:
            logger.error(f"Error updating setup info: {str(e)}")
            print(colored(f"Error updating setup info: {str(e)}", "red"))
            return False
    
    def complete_onboarding(self):
        """Complete the entire onboarding process"""
        print(colored("\n===== Completing Onboarding =====", "cyan"))
        
        try:
            # Update complete status through Cognito attributes
            self.cognito_client.admin_update_user_attributes(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=self.user_email,
                UserAttributes=[
                    {'Name': 'custom:setupdone', 'Value': 'true'},
                    {'Name': 'custom:onboarding', 'Value': 'complete'}
                ]
            )
            
            logger.info("Updated Cognito attributes for onboarding completion")
            print(colored("Onboarding completed successfully in Cognito", "green"))
            return True
                
        except Exception as e:
            logger.error(f"Error completing onboarding: {str(e)}")
            print(colored(f"Error completing onboarding: {str(e)}", "red"))
            return False
    
    def get_tenant_info(self):
        """Get tenant information for the user"""
        print(colored("\n===== Getting Tenant Information =====", "cyan"))
        
        try:
            # Get user attributes from Cognito
            user_response = self.cognito_client.admin_get_user(
                UserPoolId=COGNITO_USER_POOL_ID,
                Username=self.user_email
            )
            
            # Extract tenant ID from user attributes
            tenant_id = None
            tenant_schema = None
            
            for attr in user_response.get('UserAttributes', []):
                if attr['Name'] == 'custom:businessid':
                    tenant_id = attr['Value']
                    break
            
            if tenant_id:
                # In an actual implementation, we'd query RDS for the schema name
                # For now, we'll construct it from the tenant ID
                tenant_schema = f"tenant_{tenant_id.replace('-', '_')}"
                self.tenant_id = tenant_id
                self.tenant_schema = tenant_schema
                
                logger.info(f"Retrieved tenant info - ID: {self.tenant_id}")
                print(colored(f"Retrieved tenant info - ID: {self.tenant_id}", "green"))
                print(colored(f"Tenant Schema: {self.tenant_schema}", "green"))
                
                return {
                    "tenantId": tenant_id,
                    "schemaName": tenant_schema
                }
            else:
                logger.warning("No tenant ID found in user attributes")
                print(colored("No tenant ID found in user attributes", "yellow"))
                return None
                
        except Exception as e:
            logger.error(f"Error getting tenant info: {str(e)}")
            print(colored(f"Error getting tenant info: {str(e)}", "red"))
            return None
    
    def open_dashboard_in_browser(self):
        """Open the dashboard in the browser"""
        print(colored("\n===== Opening Dashboard in Browser =====", "cyan"))
        
        dashboard_url = f"{FRONTEND_URL}/dashboard"
        
        # Create a local HTML file with session data to automatically log in
        session_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirecting to Dashboard</title>
            <script>
                // Store auth tokens in local storage
                localStorage.setItem('idToken', '{self.id_token}');
                localStorage.setItem('accessToken', '{self.access_token}');
                localStorage.setItem('refreshToken', '{self.refresh_token}');
                localStorage.setItem('email', '{self.user_email}');
                localStorage.setItem('tenantId', '{self.tenant_id}');
                
                // Set cookies if needed
                document.cookie = "tenantId={self.tenant_id}; path=/; SameSite=Lax";
                
                // Redirect to dashboard
                window.location.href = "{dashboard_url}";
            </script>
        </head>
        <body>
            <h1>Redirecting to Dashboard...</h1>
            <p>If you are not redirected automatically, <a href="{dashboard_url}">click here</a>.</p>
        </body>
        </html>
        """
        
        # Write to temporary file
        with open('dashboard_redirect.html', 'w') as f:
            f.write(session_html)
        
        # Open in browser
        redirect_url = f"file://{os.path.abspath('dashboard_redirect.html')}"
        print(colored(f"Opening browser to: {redirect_url}", "green"))
        webbrowser.open(redirect_url)
        
        # Also show direct URL if needed
        print(colored(f"Direct dashboard URL: {dashboard_url}", "yellow"))
        print(colored("Note: You may need to manually sign in with these credentials:", "yellow"))
        print(f"Email: {self.user_email}")
        print(f"Password: {self.user_password}")
    
    def run_full_flow(self):
        """Run the full user flow from signup to dashboard"""
        print(colored("Starting automated user flow", "cyan", attrs=["bold"]))
        
        # Get user input
        self.get_user_input()
        
        # Signup
        signup_response = self.signup_user()
        
        # Verify email
        self.verify_user_email(signup_response)
        
        # Signin
        signin_response = self.signin_user()
        
        if not signin_response:
            print(colored("Failed to sign in. Exiting.", "red"))
            sys.exit(1)
        
        # Complete onboarding steps
        print(colored("\n===== Starting Onboarding Process =====", "cyan"))
        
        # Business info
        if self.complete_business_info():
            print(colored("✓ Business info step completed", "green"))
        else:
            print(colored("✗ Failed to complete business info step", "red"))
            if not input(colored("Continue anyway? (y/n): ", "yellow")).strip().lower() == 'y':
                sys.exit(1)
        
        # Subscription
        subscription_result = self.complete_subscription_step()
        if subscription_result:
            print(colored("✓ Subscription step completed", "green"))
            
            # Store the selected plan for later use
            self.selected_plan = subscription_result.get('plan', 'free')
            self.selected_interval = subscription_result.get('interval', 'MONTHLY')
            
            print(colored(f"Selected plan: {self.selected_plan}/{self.selected_interval}", "cyan"))
        else:
            print(colored("✗ Failed to complete subscription step", "red"))
            if not input(colored("Continue anyway? (y/n): ", "yellow")).strip().lower() == 'y':
                sys.exit(1)
        
        # For FREE plans, onboarding is already complete, so we can skip the remaining steps
        if hasattr(self, 'selected_plan') and self.selected_plan == 'free':
            print(colored("Remaining onboarding steps skipped for free plan - already marked as complete", "cyan"))
            
            # Verify onboarding status is set to complete
            try:
                user_response = self.cognito_client.admin_get_user(
                    UserPoolId=COGNITO_USER_POOL_ID,
                    Username=self.user_email
                )
                
                onboarding_status = None
                for attr in user_response.get('UserAttributes', []):
                    if attr['Name'] == 'custom:onboarding':
                        onboarding_status = attr['Value']
                        break
                
                if onboarding_status != 'complete':
                    print(colored(f"Warning: Onboarding status is '{onboarding_status}' instead of 'complete'. Fixing...", "yellow"))
                    # Ensure it's set to complete for FREE plans
                    self.cognito_client.admin_update_user_attributes(
                        UserPoolId=COGNITO_USER_POOL_ID,
                        Username=self.user_email,
                        UserAttributes=[
                            {'Name': 'custom:setupdone', 'Value': 'true'},
                            {'Name': 'custom:onboarding', 'Value': 'complete'}
                        ]
                    )
                    print(colored("✓ Onboarding status corrected to 'complete'", "green"))
            except Exception as e:
                logger.warning(f"Error verifying onboarding status: {str(e)}")
                
        else:
            # Payment (for paid plans only)
            if hasattr(self, 'selected_plan') and self.selected_plan in ['PROFESSIONAL', 'ENTERPRISE']:
                print(colored(f"Payment required for {self.selected_plan} plan", "cyan"))
                if self.complete_payment_step():
                    print(colored("✓ Payment step completed", "green"))
                else:
                    print(colored("✗ Failed to complete payment step", "red"))
                    if not input(colored("Continue anyway? (y/n): ", "yellow")).strip().lower() == 'y':
                        sys.exit(1)
            else:
                # This section should never execute for FREE plans, since we handle them above
                print(colored("Payment step skipped", "cyan"))
            
            # Setup
            if self.complete_setup_step():
                print(colored("✓ Setup step completed", "green"))
            else:
                print(colored("✗ Failed to complete setup step", "red"))
                if not input(colored("Continue anyway? (y/n): ", "yellow")).strip().lower() == 'y':
                    sys.exit(1)
            
            # Complete onboarding
            if self.complete_onboarding():
                print(colored("✓ Onboarding completed successfully", "green"))
            else:
                print(colored("✗ Failed to complete onboarding", "red"))
                if not input(colored("Continue anyway? (y/n): ", "yellow")).strip().lower() == 'y':
                    sys.exit(1)
        
        # Get tenant info for the user
        tenant_info = self.get_tenant_info()
        
        # Open dashboard in browser
        print(colored("\n===== Automation Complete =====", "cyan", attrs=["bold"]))
        if input(colored("Open dashboard in browser? (y/n): ", "green")).strip().lower() == 'y':
            self.open_dashboard_in_browser()
        
        print(colored("\nUser flow automation completed successfully!", "green", attrs=["bold"]))
        print(f"Email: {self.user_email}")
        print(f"Password: {self.user_password}")
        print(f"Plan: {getattr(self, 'selected_plan', 'free')}")
        print(f"Tenant ID: {self.tenant_id}")
        print(f"Tenant Schema: {self.tenant_schema}")

# Run the script
if __name__ == "__main__":
    automation = UserFlowAutomation()
    automation.run_full_flow() 