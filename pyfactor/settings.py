import uuid

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'custom_auth.middleware.TenantMiddleware',
]

# Set a default tenant ID (used when no tenant is specified)
DEFAULT_TENANT_ID = uuid.UUID('00000000-0000-0000-0000-000000000000')  # Specify a default UUID 