import re

# Read the current settings file
with open('pyfactor/settings_eb.py', 'r') as f:
    content = f.read()

# Remove any existing SSL configuration blocks
ssl_patterns = [
    r'# ============= HTTPS/SSL CONFIGURATION.*?(?=\n# |$)',
    r'# ============= HTTPS/SSL CONFIGURATION \(FIXED\).*?(?=\n# |$)',
    r'SECURE_PROXY_SSL_HEADER.*?\n',
    r'SECURE_SSL_REDIRECT.*?\n',
    r'SESSION_COOKIE_SECURE.*?\n',
    r'CSRF_COOKIE_SECURE.*?\n',
]

for pattern in ssl_patterns:
    content = re.sub(pattern, '', content, flags=re.DOTALL)

# Write back cleaned content
with open('pyfactor/settings_eb.py', 'w') as f:
    f.write(content)

print("✓ Django settings cleaned")
