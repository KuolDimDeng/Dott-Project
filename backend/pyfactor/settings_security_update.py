# Add these security settings to your Django settings.py

# CORS Configuration for secure cookies
CORS_ALLOWED_ORIGINS = [
    "https://dottapps.com",
    "https://www.dottapps.com",
]

CORS_ALLOW_CREDENTIALS = True  # Essential for cookies

# Session cookie settings
SESSION_COOKIE_DOMAIN = '.dottapps.com'  # Works across subdomains
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # No JS access
SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
SESSION_COOKIE_AGE = 86400 * 7  # 7 days

# CSRF settings
CSRF_COOKIE_DOMAIN = '.dottapps.com'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = [
    "https://dottapps.com",
    "https://www.dottapps.com",
    "https://api.dottapps.com"
]

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True