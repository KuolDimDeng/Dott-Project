"""
Auth0 Settings Update for Django
Add these settings to your main settings.py file
"""

# ===== AUTH0 CONFIGURATION =====

# Auth0 Domain and API settings
AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN', 'dev-cbyy63jovi6zrcos.us.auth0.com')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE', 'https://pyfactor-api')
AUTH0_CLIENT_ID = os.getenv('AUTH0_CLIENT_ID')
AUTH0_CLIENT_SECRET = os.getenv('AUTH0_CLIENT_SECRET')

# Email settings for Auth0
EMAIL_FROM = os.getenv('EMAIL_FROM', 'noreply@dottapps.com')
DEFAULT_FROM_EMAIL = EMAIL_FROM

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Stripe Price IDs (create these in Stripe dashboard)
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = os.getenv('STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID')
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID = os.getenv('STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID')
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = os.getenv('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID')
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID = os.getenv('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID')

# ===== MIDDLEWARE UPDATE =====
# Add Auth0 middleware BEFORE authentication middleware
# Find MIDDLEWARE in your settings and update it:

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'custom_auth.cors.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'accounts.auth0_middleware.Auth0Middleware',  # ADD THIS LINE
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'custom_auth.middleware.TokenRefreshMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware',
    'hr.middleware.HrCorsMiddleware',
    'onboarding.middleware.SchemaNameMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'custom_auth.middleware.RequestIDMiddleware',
    'custom_auth.middleware.TenantMiddleware',
    'custom_auth.dashboard_middleware.DashboardMigrationMiddleware',
]

# ===== INSTALLED APPS UPDATE =====
# Make sure 'accounts' is in INSTALLED_APPS

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'accounts',  # Make sure this is included
    # ... other apps
]

# ===== AUTHENTICATION SETTINGS =====
# Replace Cognito settings with Auth0

# Comment out or remove these Cognito settings:
# USE_AWS_AUTH = True
# COGNITO_TOKEN_VERIFY = True
# AWS_COGNITO_REGION = ...
# AWS_COGNITO_USER_POOL_ID = ...

# Add Auth0 authentication
USE_AUTH0 = True
AUTH0_TOKEN_VERIFY = True

# ===== CORS UPDATES =====
# Add Auth0 domain to CORS allowed origins

CORS_ALLOWED_ORIGINS = [
    # Local development
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    # Backend URLs
    'https://localhost:8000',
    'https://127.0.0.1:8000',
    # Production
    'https://pyfactor.ai',
    'https://*.pyfactor.ai',
    # Auth0
    f'https://{AUTH0_DOMAIN}',
]

# ===== REST FRAMEWORK UPDATE =====
# Update authentication classes

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # Remove or comment out:
        # 'custom_auth.authentication.CognitoJWTAuthentication',
        # Add:
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # ... other settings
}

# ===== DATABASE CONFIGURATION =====
# Ensure accounts models are included

# No changes needed, just ensure migrations run

# ===== LOGGING UPDATE =====
# Add Auth0 logging

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'accounts.auth0_middleware': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'accounts.views_auth0': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        # ... other loggers
    },
}