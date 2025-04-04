#/Users/kuoldeng/projectx/backend/pyfactor/scripts/reconfigure_cognito.py
import os
import sys
import django
import boto3
import logging

import pathlib

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get the absolute path to the Django project root
project_root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

try:
    # Set up Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    django.setup()

    from django.conf import settings
    logger.info("Django settings loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Django settings: {str(e)}")
    sys.exit(1)

# Verify settings are loaded
if not hasattr(settings, 'AWS_ACCESS_KEY_ID'):
    logger.error("AWS credentials not found in Django settings")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def verify_settings():
    """Verify all required settings are present"""
    required_settings = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_COGNITO_USER_POOL_ID',
        'AWS_COGNITO_CLIENT_ID'
    ]
    
    missing_settings = [
        setting for setting in required_settings
        if not hasattr(settings, setting) or not getattr(settings, setting)
    ]
    
    if missing_settings:
        raise RuntimeError(
            f"Missing required settings: {', '.join(missing_settings)}"
        )

def reconfigure_cognito_user_pool():
    """
    Reconfigure Cognito user pool with required authentication flows and settings
    """
    try:
        # Verify all required settings are present
        verify_settings()
        
        logger.info("Creating Cognito client...")
        client = boto3.client('cognito-idp',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        logger.info("Cognito client created successfully")

        # Update app client settings to enable required auth flows
        response = client.update_user_pool_client(
            UserPoolId=settings.AWS_COGNITO_USER_POOL_ID,
            ClientId=settings.AWS_COGNITO_CLIENT_ID,
            ExplicitAuthFlows=[
                'ALLOW_USER_PASSWORD_AUTH',  # Enable username/password auth
                'ALLOW_USER_SRP_AUTH',       # Enable Secure Remote Password
                'ALLOW_REFRESH_TOKEN_AUTH'   # Enable refresh token usage
            ],
            SupportedIdentityProviders=['COGNITO'],
            CallbackURLs=[
                'http://localhost:3000/auth/callback'
            ],
            LogoutURLs=[
                'http://localhost:3000'
            ],
            AllowedOAuthFlows=['code'],
            AllowedOAuthScopes=[
                'email',
                'openid',
                'profile',
                'aws.cognito.signin.user.admin'
            ],
            AllowedOAuthFlowsUserPoolClient=True,
            PreventUserExistenceErrors='ENABLED'
        )

        logger.info('Successfully updated Cognito user pool client configuration')
        logger.debug('Update response: %s', response)

        logger.info("Updating Cognito user pool password policy...")
        response = client.update_user_pool(
            UserPoolId=settings.AWS_COGNITO_USER_POOL_ID,
            Policies={
                'PasswordPolicy': {
                    'MinimumLength': 8,
                    'RequireUppercase': True,
                    'RequireLowercase': True,
                    'RequireNumbers': True,
                    'RequireSymbols': True,
                    'TemporaryPasswordValidityDays': 7
                }
            },
            AutoVerifiedAttributes=['email'],
            EmailConfiguration={
                'EmailSendingAccount': 'COGNITO_DEFAULT',
                'From': 'no-reply@verificationemail.com',  # Optional: Set a from address
                'ReplyToEmailAddress': 'no-reply@verificationemail.com'  # Optional: Set a reply-to address
            },
            # Configure verification message template to prevent duplicates
            EmailVerificationMessage='Thank you for signing up! Your verification code is {####}',
            EmailVerificationSubject='Your verification code',
            AdminCreateUserConfig={
                'AllowAdminCreateUserOnly': False,
                'UnusedAccountValidityDays': 7,
                'InviteMessageTemplate': {
                    'EmailMessage': 'Your username is {username} and temporary password is {####}.',
                    'EmailSubject': 'Your temporary password',
                    'SMSMessage': 'Your username is {username} and temporary password is {####}.'
                }
            },
            # Disable triggers that might be causing duplicate emails
            LambdaConfig={
                'PreSignUp': None,
                'CustomMessage': None,
                'PostConfirmation': 'cognito-post-confirmation-trigger',
                'PreAuthentication': None,
                'PostAuthentication': None,
                'DefineAuthChallenge': None,
                'CreateAuthChallenge': None,
                'VerifyAuthChallengeResponse': None,
                'PreTokenGeneration': None,
                'UserMigration': None
            }
        )

        logger.debug('Password policy update response: %s', response)
        logger.info('Successfully updated Cognito user pool password policy and configuration')
        return True

    except Exception as e:
        logger.error(f'Failed to reconfigure Cognito user pool: {str(e)}')
        raise

if __name__ == '__main__':
    try:
        logger.info("Starting Cognito user pool reconfiguration...")
        reconfigure_cognito_user_pool()
        logger.info("Successfully completed Cognito user pool reconfiguration")
    except Exception as e:
        logger.error("Failed to reconfigure Cognito user pool", exc_info=True)
        sys.exit(1)
    sys.exit(0)