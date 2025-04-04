#!/usr/bin/env python
"""
Test script to simulate the onboarding flow from business info submission to dashboard access.
This script helps debug the migration process without manual intervention.

Usage:
    python test_onboarding_flow.py [--email user@example.com] [--password password] [--debug]

Options:
    --email      Email to use for testing (default: test_user@example.com)
    --password   Password to use for testing (default: Test123!)
    --debug      Enable debug logging
"""

import os
import sys
import json
import time
import uuid
import random
import logging
import argparse
import requests
from datetime import datetime, timedelta
import django
from django.utils import timezone

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Import Django models
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from users.models import UserProfile
from users.models import Business
from onboarding.models import OnboardingProgress

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('onboarding_test.log')
    ]
)
logger = logging.getLogger('onboarding_test')

User = get_user_model()

class OnboardingFlowTester:
    """Class to test the onboarding flow from business info to dashboard"""
    
    def __init__(self, email, password, debug=False):
        self.email = email
        self.password = password
        self.base_url = "http://127.0.0.1:8000/api"
        self.token = None
        self.user = None
        self.tenant = None
        self.business = None
        self.request_id = str(uuid.uuid4())
        
        if debug:
            logger.setLevel(logging.DEBUG)
        
        logger.info(f"Initializing onboarding flow test for {email}")
    
    def setup_test_user(self):
        """Create or get a test user"""
        logger.info(f"Setting up test user: {self.email}")
        
        # Check if user exists
        try:
            self.user = User.objects.get(email=self.email)
            logger.info(f"Found existing user: {self.user.id}")
            
            # Reset user's onboarding state
            self._reset_user_state()
            
        except User.DoesNotExist:
            # Create new user
            logger.info("Creating new test user")
            self.user = User.objects.create_user(
                email=self.email,
                password=self.password,
                first_name="Test",
                last_name="User"
            )
            logger.info(f"Created new user: {self.user.id}")
        
        return self.user
    
    def _reset_user_state(self):
        """Reset user's onboarding state for testing"""
        logger.info(f"Resetting onboarding state for user: {self.user.id}")
        
        # Delete tenant if exists
        if hasattr(self.user, 'tenant') and self.user.tenant:
            logger.info(f"Deleting tenant: {self.user.tenant.id}")
            
            # Drop schema if exists
            if self.user.tenant.schema_name:
                schema_name = self.user.tenant.schema_name
                logger.info(f"Dropping schema: {schema_name}")
                
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            
            self.user.tenant.delete()
        
        # Delete business if exists
        try:
            business = Business.objects.filter(owner=self.user).first()
            if business:
                logger.info(f"Deleting business: {business.id}")
                business.delete()
        except Exception as e:
            logger.warning(f"Error deleting business: {str(e)}")
        
        # Delete onboarding progress if exists
        try:
            progress = OnboardingProgress.objects.filter(user=self.user).first()
            if progress:
                logger.info(f"Deleting onboarding progress: {progress.id}")
                progress.delete()
        except Exception as e:
            logger.warning(f"Error deleting onboarding progress: {str(e)}")
        
        # Reset profile metadata
        try:
            profile = UserProfile.objects.get(user=self.user)
            if hasattr(profile, 'metadata') and profile.metadata:
                logger.info("Resetting profile metadata")
                profile.metadata = {}
                profile.save(update_fields=['metadata'])
        except Exception as e:
            logger.warning(f"Error resetting profile metadata: {str(e)}")
    
    def authenticate(self):
        """Authenticate with the API and get token"""
        logger.info("Authenticating with API")
        
        # For testing purposes, we'll create a token directly
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        self.token = str(refresh.access_token)
        
        logger.info("Authentication successful")
        return self.token
    
    def submit_business_info(self):
        """Submit business info to start onboarding"""
        logger.info("Submitting business info")
        
        # Generate random business data
        business_name = f"Test Business {random.randint(1000, 9999)}"
        business_data = {
            "business_name": business_name,
            "business_type": "service",
            "country": "US",
            "legal_structure": "sole_proprietorship",
            "date_founded": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "first_name": self.user.first_name,
            "last_name": self.user.last_name
        }
        
        # Make API request
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Request-Id": self.request_id
        }
        
        response = requests.post(
            f"{self.base_url}/onboarding/save-business-info/",
            json=business_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("Business info submitted successfully")
            response_data = response.json()
            logger.debug(f"Response: {json.dumps(response_data, indent=2)}")
            
            # Get business ID from response
            if 'data' in response_data and 'businessInfo' in response_data['data']:
                business_id = response_data['data']['businessInfo']['id']
                logger.info(f"Business ID: {business_id}")
                
                # Get business from database
                self.business = Business.objects.get(id=business_id)
            
            return response_data
        else:
            logger.error(f"Failed to submit business info: {response.status_code}")
            logger.error(f"Response: {response.text}")
            raise Exception(f"Failed to submit business info: {response.status_code}")
    
    def submit_subscription(self):
        """Submit subscription info"""
        logger.info("Submitting subscription info")
        
        subscription_data = {
            "selected_plan": "free",
            "billing_cycle": "monthly"
        }
        
        # Make API request
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Request-Id": self.request_id
        }
        
        response = requests.post(
            f"{self.base_url}/onboarding/subscription/save/",
            json=subscription_data,
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("Subscription info submitted successfully")
            response_data = response.json()
            logger.debug(f"Response: {json.dumps(response_data, indent=2)}")
            return response_data
        else:
            logger.error(f"Failed to submit subscription info: {response.status_code}")
            logger.error(f"Response: {response.text}")
            raise Exception(f"Failed to submit subscription info: {response.status_code}")
    
    def complete_onboarding(self):
        """Complete the onboarding process"""
        logger.info("Completing onboarding")
        
        # Make API request
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Request-Id": self.request_id
        }
        
        response = requests.post(
            f"{self.base_url}/onboarding/complete/",
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("Onboarding completed successfully")
            response_data = response.json()
            logger.debug(f"Response: {json.dumps(response_data, indent=2)}")
            return response_data
        else:
            logger.error(f"Failed to complete onboarding: {response.status_code}")
            logger.error(f"Response: {response.text}")
            raise Exception(f"Failed to complete onboarding: {response.status_code}")
    
    def access_dashboard(self):
        """Simulate dashboard access to trigger schema setup"""
        logger.info("Accessing dashboard to trigger schema setup")
        
        # Make API request to dashboard setup endpoint
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Request-Id": self.request_id
        }
        
        response = requests.post(
            f"{self.base_url}/onboarding/dashboard/setup/",
            headers=headers
        )
        
        if response.status_code in [200, 202]:
            logger.info("Dashboard access successful, schema setup triggered")
            response_data = response.json()
            logger.debug(f"Response: {json.dumps(response_data, indent=2)}")
            
            # Get task ID from response
            if 'task_id' in response_data:
                task_id = response_data['task_id']
                logger.info(f"Schema setup task ID: {task_id}")
                
                # Monitor task status
                self.monitor_task_status(task_id)
            
            return response_data
        else:
            logger.error(f"Failed to access dashboard: {response.status_code}")
            logger.error(f"Response: {response.text}")
            raise Exception(f"Failed to access dashboard: {response.status_code}")
    
    def monitor_task_status(self, task_id, timeout=300, interval=5):
        """Monitor the status of a task"""
        logger.info(f"Monitoring task status: {task_id}")
        
        # Make API request
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Request-Id": self.request_id
        }
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            response = requests.get(
                f"{self.base_url}/onboarding/tasks/{task_id}/status/",
                headers=headers
            )
            
            if response.status_code == 200:
                response_data = response.json()
                status = response_data.get('status')
                progress = response_data.get('progress', 0)
                
                logger.info(f"Task status: {status}, Progress: {progress}%")
                
                if status == 'SUCCESS':
                    logger.info("Task completed successfully")
                    return response_data
                elif status == 'FAILURE':
                    logger.error(f"Task failed: {response_data.get('error')}")
                    raise Exception(f"Task failed: {response_data.get('error')}")
                
                # Wait before checking again
                time.sleep(interval)
            else:
                logger.error(f"Failed to get task status: {response.status_code}")
                logger.error(f"Response: {response.text}")
                raise Exception(f"Failed to get task status: {response.status_code}")
        
        logger.error(f"Task monitoring timed out after {timeout} seconds")
        raise Exception(f"Task monitoring timed out after {timeout} seconds")
    
    def check_database_status(self):
        """Check the status of the database setup"""
        logger.info("Checking database status")
        
        # Get tenant from database
        self.tenant = Tenant.objects.filter(owner=self.user).first()
        
        if not self.tenant:
            logger.error("No tenant found for user")
            return False
        
        logger.info(f"Tenant: {self.tenant.id}")
        logger.info(f"Schema name: {self.tenant.schema_name}")
        logger.info(f"Database status: {self.tenant.database_status}")
        logger.info(f"Setup status: {self.tenant.setup_status}")
        
        # Check if schema exists
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name = %s
            """, [self.tenant.schema_name])
            schema_exists = cursor.fetchone() is not None
        
        logger.info(f"Schema exists: {schema_exists}")
        
        if schema_exists:
            # Check tables in schema
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = %s
                """, [self.tenant.schema_name])
                tables = [row[0] for row in cursor.fetchall()]
            
            logger.info(f"Tables in schema: {len(tables)}")
            logger.debug(f"Tables: {tables}")
        
        return schema_exists
    
    def test_tiered_storage(self):
        """Test the tiered storage approach for onboarding"""
        logger.info("Testing tiered storage approach for onboarding")
        
        # Create a session and store data
        url = f"{self.base_url}/api/status/"
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-Request-Id": self.request_id
        }
        
        # Get current onboarding status
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Failed to get onboarding status: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
        logger.info("Successfully retrieved onboarding status")
        initial_data = response.json()
        
        # Store data in Redis session (business info step)
        business_data = {
            "step": "business-info",
            "data": {
                "business_info": {
                    "name": "Test Business",
                    "type": "Corporation",
                    "country": "US",
                    "legal_structure": "LLC"
                }
            }
        }
        
        # Update onboarding status with business info
        response = requests.post(url, headers=headers, json=business_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to update business info: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
        logger.info("Successfully updated business info")
        session_id = response.json().get('session_id')
        logger.info(f"Session ID: {session_id}")
        
        # Get session cookie
        onboarding_session_cookie = response.cookies.get('onboardingSessionId')
        
        if onboarding_session_cookie:
            # Add session cookie to headers
            headers['Cookie'] = f"onboardingSessionId={onboarding_session_cookie}"
        
        # Check that data was stored in Redis and DB
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Failed to get updated status: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
        updated_data = response.json()
        logger.info(f"Updated data: {json.dumps(updated_data, indent=2)}")
        
        # Verify that business info was stored
        business_info = updated_data.get('business_info', {})
        if business_info.get('name') != "Test Business":
            logger.error("Business info was not stored correctly")
            return False
        
        logger.info("Business info was stored correctly in tiered storage")
        
        # Test subscription step
        subscription_data = {
            "step": "subscription",
            "data": {
                "selected_plan": "free",
                "billing_cycle": "monthly"
            }
        }
        
        # Update subscription info
        response = requests.post(url, headers=headers, json=subscription_data)
        
        if response.status_code != 200:
            logger.error(f"Failed to update subscription: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
        logger.info("Successfully updated subscription info")
        
        # Check that progress was updated
        response = requests.get(url, headers=headers)
        updated_data = response.json()
        
        if updated_data.get('current_step') != "subscription":
            logger.error("Subscription step was not updated correctly")
            return False
        
        # Test completing the onboarding process
        complete_url = f"{self.base_url}/api/complete/"
        response = requests.post(complete_url, headers=headers)
        
        if response.status_code != 200:
    def run_test(self):
        """Run the complete onboarding flow test"""
        try:
            logger.info("Starting onboarding flow test")
            
            # Setup test user
            self.setup_test_user()
            
            # Authenticate
            self.authenticate()
            
            # Submit business info
            self.submit_business_info()
            
            # Check database status after business info submission
            logger.info("Checking database status after business info submission")
            self.check_database_status()
            
            # Submit subscription
            self.submit_subscription()
            
            # Complete onboarding
            self.complete_onboarding()
            
            # Access dashboard to trigger schema setup
            self.access_dashboard()
            
            # Final database status check
            logger.info("Final database status check")
            self.check_database_status()
            
            logger.info("Onboarding flow test completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Onboarding flow test failed: {str(e)}")
            return False

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Test onboarding flow')
    parser.add_argument('--email', default='test_user@example.com', help='Email to use for testing')
    parser.add_argument('--password', default='Test123!', help='Password to use for testing')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    return parser.parse_args()

if __name__ == '__main__':
    args = parse_args()
    tester = OnboardingFlowTester(args.email, args.password, args.debug)
    success = tester.run_test()
    sys.exit(0 if success else 1)