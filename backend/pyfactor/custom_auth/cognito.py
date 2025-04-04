import boto3
import logging
from django.conf import settings
from django.utils import timezone
from botocore.exceptions import ClientError
import jwt
from jwt import PyJWKClient

from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed
import requests
import os
import json
import time


logger = logging.getLogger(__name__)

class CognitoJWTValidationError(Exception):
    pass

class CognitoClient:
    def __init__(self):
        self.client = boto3.client('cognito-idp',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_APP_CLIENT_ID
        # Configure authentication flows in order of preference
        self.auth_flows = [
            'USER_SRP_AUTH',           # Primary: Secure Remote Password
            'USER_PASSWORD_AUTH',      # Fallback: Direct username/password
            'REFRESH_TOKEN_AUTH'       # Token refresh
        ]

    def initiate_auth(self, username, password):
        """Initiate authentication with Cognito"""
        try:
            # Try SRP auth first
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='USER_SRP_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'SRP_A': password  # In real SRP, this would be the SRP calculation
                }
            )
            logger.debug('SRP auth successful')
            return response
        except ClientError as e:
            if e.response['Error']['Code'] == 'NotAuthorizedException':
                logger.debug('SRP auth failed, falling back to USER_PASSWORD_AUTH')
                # Fall back to USER_PASSWORD_AUTH
                try:
                    response = self.client.initiate_auth(
                        ClientId=self.client_id,
                        AuthFlow='USER_PASSWORD_AUTH',
                        AuthParameters={
                            'USERNAME': username,
                            'PASSWORD': password
                        }
                    )
                    logger.debug('Password auth successful')
                    return response
                except ClientError as e2:
                    logger.error(f"Password authentication failed: {str(e2)}")
                    raise
            else:
                logger.error(f"Authentication failed: {str(e)}")
                raise

    def refresh_auth(self, refresh_token):
        """Refresh authentication using refresh token"""
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': refresh_token
                }
            )
            logger.debug('Token refresh successful')
            return response
        except ClientError as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise

    def get_user_attributes(self, access_token):
        """Get user attributes from Cognito"""
        try:
            response = self.client.get_user(
                AccessToken=access_token
            )
            return {attr['Name']: attr['Value'] for attr in response['UserAttributes']}
        except ClientError as e:
            logger.error(f"Failed to get user attributes: {str(e)}")
            raise

    def update_user_attributes(self, access_token, attributes):
        """Update user attributes in Cognito"""
        try:
            # Convert attributes to Cognito format and ensure custom attributes have the correct prefix
            user_attributes = []
            for key, value in attributes.items():
                # Ensure custom attributes have the 'custom:' prefix
                if not key.startswith('custom:') and not key in ['email', 'given_name', 'family_name', 'name', 'phone_number']:
                    # These attribute types should have the custom: prefix
                    custom_attr_patterns = ['business', 'onboarding', 'setup', 'sub', 'acc', 'payment', 
                                           'preferences', 'legal', 'date', 'attr', 'use', 'pay', 'last']
                    
                    # Check if the key matches any of the patterns for custom attributes
                    should_be_custom = any(pattern in key.lower() for pattern in custom_attr_patterns)
                    
                    if should_be_custom:
                        key = f'custom:{key}'
                        logger.debug(f"Converted attribute key to custom format: {key}")
                
                # Add the attribute to the list
                user_attributes.append({'Name': key, 'Value': str(value)})
            
            response = self.client.update_user_attributes(
                AccessToken=access_token,
                UserAttributes=user_attributes
            )
            
            logger.info(f"Updated user attributes: {attributes}")
            return response
        except ClientError as e:
            logger.error(f"Failed to update user attributes: {str(e)}")
            raise

    def validate_onboarding_state(self, current_state, new_state):
        """Validate onboarding state transition"""
        valid_transitions = {
            'NOT_STARTED': ['BUSINESS_INFO'],
            'BUSINESS_INFO': ['SUBSCRIPTION'],
            'SUBSCRIPTION': ['PAYMENT', 'SETUP'],
            'PAYMENT': ['SETUP'],
            'SETUP': ['COMPLETE'],
            'COMPLETE': []
        }

        current_state = current_state.upper()
        new_state = new_state.upper()

        if current_state not in valid_transitions:
            raise ValueError(f"Invalid current state: {current_state}")

        if new_state not in valid_transitions[current_state]:
            raise ValueError(
                f"Invalid state transition from {current_state} to {new_state}. "
                f"Valid transitions are: {valid_transitions[current_state]}"
            )

        return True

    def update_onboarding_status(self, access_token, new_status, additional_attrs=None):
        """Update onboarding status and related attributes"""
        try:
            # Get current attributes
            current_attrs = self.get_user_attributes(access_token)
            current_status = current_attrs.get('custom:onboarding', 'NOT_STARTED')

            # Validate state transition
            self.validate_onboarding_state(current_status, new_status)

            # Prepare attributes to update
            update_attrs = {
                'custom:onboarding': new_status.upper(),
                'custom:updated_at': timezone.now().isoformat()
            }

            # Add any additional attributes
            if additional_attrs:
                update_attrs.update(additional_attrs)

            # Update attributes in Cognito
            self.update_user_attributes(access_token, update_attrs)

            logger.info(f"Updated onboarding status from {current_status} to {new_status}")
            return True

        except ClientError as e:
            logger.error(f"Failed to update onboarding status: {str(e)}")
            raise

    def initialize_user_attributes(self, access_token):
        """Initialize default attributes for new user"""
        try:
            default_attrs = {
                'custom:onboarding': 'NOT_STARTED',
                'custom:userrole': 'OWNER',
                'custom:acctstatus': 'PENDING',
                'custom:subplan': 'FREE',
                'custom:subscriptioninterval': 'MONTHLY',
                'custom:lastlogin': timezone.now().isoformat(),
                'custom:preferences': '{"notifications":true,"theme":"light","language":"en"}',
                'custom:attrversion': '1.0.0',
                'custom:created_at': timezone.now().isoformat(),
                'custom:updated_at': timezone.now().isoformat(),
                'custom:setupdone': 'FALSE',
                'custom:payverified': 'FALSE'
            }

            self.update_user_attributes(access_token, default_attrs)
            logger.info("Initialized default user attributes")
            return default_attrs

        except ClientError as e:
            logger.error(f"Failed to initialize user attributes: {str(e)}")
            raise

    def validate_attributes(self, attributes):
        """Validate attribute values"""
        valid_onboarding_states = [
            'NOT_STARTED', 'BUSINESS_INFO', 'SUBSCRIPTION',
            'PAYMENT', 'SETUP', 'COMPLETE'
        ]
        valid_roles = ['OWNER', 'ADMIN']
        valid_statuses = ['PENDING', 'ACTIVE']
        valid_plans = ['FREE', 'PROFESSIONAL']
        valid_intervals = ['MONTHLY', 'YEARLY']
        valid_boolean = ['TRUE', 'FALSE']

        errors = []

        def validate_enum(value, valid_values, field_name):
            if value and value.upper() not in valid_values:
                errors.append(f"Invalid {field_name}: {value}")

        def validate_length(value, min_length, max_length, field_name):
            if value and (len(value) < min_length or len(value) > max_length):
                errors.append(f"{field_name} length must be between {min_length} and {max_length}")

        # Validate enums
        validate_enum(attributes.get('custom:onboarding'), valid_onboarding_states, 'onboarding state')
        validate_enum(attributes.get('custom:userrole'), valid_roles, 'user role')
        validate_enum(attributes.get('custom:acctstatus'), valid_statuses, 'account status')
        validate_enum(attributes.get('custom:subplan'), valid_plans, 'subscription plan')
        validate_enum(attributes.get('custom:subscriptioninterval'), valid_intervals, 'subscription interval')
        validate_enum(attributes.get('custom:setupdone'), valid_boolean, 'setup done')
        validate_enum(attributes.get('custom:payverified'), valid_boolean, 'payment verified')

        # Validate lengths for string fields
        field_constraints = {
            'custom:acctstatus': (6, 9),
            'custom:attrversion': (5, 10),
            'custom:businesscountry': (2, 3),
            'custom:businessid': (36, 36),
            'custom:businessname': (1, 256),
            'custom:businesstype': (1, 256),
            'custom:created_at': (1, 24),
            'custom:datefounded': (1, 10),
            'custom:firstname': (1, 256),
            'custom:lastlogin': (1, 24),
            'custom:lastname': (1, 256),
            'custom:legalstructure': (1, 256),
            'custom:onboarding': (1, 256),
            'custom:paymentid': (1, 256),
            'custom:payverified': (4, 5),
            'custom:preferences': (2, 2048),
            'custom:setupdone': (4, 5),
            'custom:subplan': (4, 12),
            'custom:subscriptioninterval': (6, 7),
            'custom:subscriptionstatus': (1, 24),
            'custom:updated_at': (1, 24),
            'custom:userrole': (4, 6)
        }

        for field, (min_length, max_length) in field_constraints.items():
            if field in attributes:
                validate_length(attributes[field], min_length, max_length, field)

        if errors:
            raise ValueError('\n'.join(errors))

        return True

    def recover_missing_attributes(self, access_token):
        """Recover any missing attributes with defaults"""
        try:
            current_attrs = self.get_user_attributes(access_token)
            required_attrs = {
                'custom:onboarding': 'NOT_STARTED',
                'custom:userrole': 'OWNER',
                'custom:acctstatus': 'PENDING',
                'custom:subplan': 'FREE',
                'custom:subscriptioninterval': 'MONTHLY',
                'custom:preferences': '{"notifications":true,"theme":"light","language":"en"}',
                'custom:attrversion': '1.0.0',
                'custom:setupdone': 'FALSE',
                'custom:payverified': 'FALSE',
                'custom:created_at': timezone.now().isoformat(),
                'custom:updated_at': timezone.now().isoformat()
            }

            missing_attrs = {}
            for key, default_value in required_attrs.items():
                if key not in current_attrs:
                    missing_attrs[key] = default_value

            if missing_attrs:
                self.update_user_attributes(access_token, missing_attrs)
                logger.info(f"Recovered missing attributes: {missing_attrs.keys()}")

            return missing_attrs

        except ClientError as e:
            logger.error(f"Failed to recover missing attributes: {str(e)}")
            raise

class CognitoHelper:
    def __init__(self):
        self.region = settings.COGNITO_REGION
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
        self.issuer = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"
        self.audience = settings.COGNITO_APP_CLIENT_ID
        self.jwks_client = PyJWKClient(self.jwks_url, cache_keys=True)

    def validate_token(self, token):
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.audience,
                issuer=self.issuer,
                options={"verify_exp": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise CognitoJWTValidationError("Token has expired")
        except jwt.PyJWTError as e:
            raise CognitoJWTValidationError(f"Invalid token: {str(e)}")

def get_user_from_cognito_jwt(token):
    helper = CognitoHelper()
    try:
        payload = helper.validate_token(token)
        return {
            "user_id": payload["sub"],
            "username": payload["cognito:username"],
            "email": payload["email"]
        }
    except CognitoJWTValidationError as e:
        raise AuthenticationFailed(str(e))

def update_user_attributes_sync(user_id, attributes):
    """Update user attributes synchronously using admin API with retries"""
    max_retries = 3
    retry_delay = 1
    last_error = None

    for attempt in range(max_retries):
        try:
            client = boto3.client('cognito-idp',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            
            # First verify user exists
            try:
                client.admin_get_user(
                    UserPoolId=settings.COGNITO_USER_POOL_ID,
                    Username=user_id
                )
            except client.exceptions.UserNotFoundException:
                logger.warning(f"User {user_id} not found in Cognito")
                return None
            
            # Convert attributes to Cognito format and ensure proper prefixes
            user_attributes = []
            for key, value in attributes.items():
                # Ensure custom attributes have the 'custom:' prefix
                if not key.startswith('custom:') and not key in ['email', 'given_name', 'family_name', 'name', 'phone_number']:
                    # These attribute types should have the custom: prefix
                    custom_attr_patterns = ['business', 'onboarding', 'setup', 'sub', 'acc', 'payment', 
                                           'preferences', 'legal', 'date', 'attr', 'use', 'pay', 'last']
                    
                    # Check if the key matches any of the patterns for custom attributes
                    should_be_custom = any(pattern in key.lower() for pattern in custom_attr_patterns)
                    
                    if should_be_custom:
                        key = f'custom:{key}'
                        logger.debug(f"Converted attribute key to custom format: {key}")
                
                # Add the attribute to the list
                user_attributes.append({'Name': key, 'Value': str(value)})
            
            response = client.admin_update_user_attributes(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=user_id,
                UserAttributes=user_attributes
            )
            
            logger.info(f"Updated user attributes for {user_id}: {attributes}")
            return response
            
        except client.exceptions.UserNotFoundException:
            logger.warning(f"User {user_id} not found in Cognito")
            return None
            
        except ClientError as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"Cognito update failed (attempt {attempt + 1}): {str(e)}")
                time.sleep(retry_delay * (2 ** attempt))
                continue
            else:
                logger.error(f"Failed to update user attributes after {max_retries} attempts: {str(e)}")
                raise last_error

cognito_client = CognitoClient()

# Add the function here
def get_cognito_client():
    """
    Returns the Cognito client instance.
    This function is used for consistent access to the Cognito client
    throughout the application.
    """
    return cognito_client
