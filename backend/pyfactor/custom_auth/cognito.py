import boto3
import logging
from django.conf import settings
from django.utils import timezone
from botocore.exceptions import ClientError
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)

class CognitoClient:
    def __init__(self):
        self.client = boto3.client('cognito-idp',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_APP_CLIENT_ID

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
            # Convert attributes to Cognito format
            user_attributes = [
                {'Name': key, 'Value': str(value)}
                for key, value in attributes.items()
            ]
            
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
                'custom:onboarding': new_status,
                'custom:updated_at': str(timezone.now().isoformat())
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
                'custom:subplan': 'free',
                'custom:lastlogin': str(timezone.now().isoformat()),
                'custom:preferences': '{"notifications":true,"theme":"light","language":"en"}',
                'custom:attr_version': '1.0.0',
                'custom:created_at': str(timezone.now().isoformat())
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
        valid_roles = ['OWNER', 'ADMIN', 'MEMBER']
        valid_statuses = ['PENDING', 'ACTIVE', 'SUSPENDED']
        valid_plans = ['free', 'professional']

        errors = []

        if 'custom:onboarding' in attributes:
            if attributes['custom:onboarding'] not in valid_onboarding_states:
                errors.append(f"Invalid onboarding state: {attributes['custom:onboarding']}")

        if 'custom:userrole' in attributes:
            if attributes['custom:userrole'] not in valid_roles:
                errors.append(f"Invalid user role: {attributes['custom:userrole']}")

        if 'custom:acctstatus' in attributes:
            if attributes['custom:acctstatus'] not in valid_statuses:
                errors.append(f"Invalid account status: {attributes['custom:acctstatus']}")

        if 'custom:subplan' in attributes:
            if attributes['custom:subplan'] not in valid_plans:
                errors.append(f"Invalid subscription plan: {attributes['custom:subplan']}")

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
                'custom:subplan': 'free',
                'custom:preferences': '{"notifications":true,"theme":"light","language":"en"}',
                'custom:attr_version': '1.0.0'
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

cognito_client = CognitoClient()
