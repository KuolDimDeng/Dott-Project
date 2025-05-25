#!/usr/bin/env python3
"""
Script to inject CORS settings into Django on a running Elastic Beanstalk instance
using AWS SSM Run Command
"""

import boto3
import json
import time

def inject_cors_via_ssm():
    ssm = boto3.client('ssm', region_name='us-east-1')
    ec2 = boto3.client('ec2', region_name='us-east-1')
    
    # Get the instance ID for Dott-env-fixed
    try:
        eb = boto3.client('elasticbeanstalk', region_name='us-east-1')
        env_resources = eb.describe_environment_resources(EnvironmentName='Dott-env-fixed')
        instances = env_resources['EnvironmentResources']['Instances']
        instance_id = instances[0]['Id']
        print(f"Found instance: {instance_id}")
    except Exception as e:
        print(f"Error finding instance: {e}")
        return False
    
    # Command to modify Django settings and restart
    command_text = '''#!/bin/bash
set -e

echo "=== Starting CORS Configuration ==="

# Find the settings.py file in the Django container
CONTAINER_ID=$(docker ps -q --filter ancestor=aws_beanstalk/current-app)
if [ -z "$CONTAINER_ID" ]; then
    echo "No running Django container found"
    exit 1
fi

echo "Found container: $CONTAINER_ID"

# Check if django-cors-headers is already installed
docker exec $CONTAINER_ID pip list | grep django-cors-headers || {
    echo "Installing django-cors-headers..."
    docker exec $CONTAINER_ID pip install django-cors-headers==4.0.0
}

# Create a Python script to modify settings.py
cat > /tmp/cors_injection.py << 'EOF'
import os
import re

def inject_cors_settings():
    # Try common Django settings paths
    settings_paths = [
        '/app/settings.py',
        '/app/*/settings.py',
        '/app/dott/settings.py',
        '/app/backend/settings.py'
    ]
    
    settings_file = None
    for path in settings_paths:
        try:
            if os.path.exists(path):
                settings_file = path
                break
        except:
            continue
    
    if not settings_file:
        print("Could not find settings.py file")
        return False
    
    print(f"Found settings.py at: {settings_file}")
    
    # Read the current settings
    with open(settings_file, 'r') as f:
        content = f.read()
    
    # Check if corsheaders is already in INSTALLED_APPS
    if 'corsheaders' not in content:
        # Add corsheaders to INSTALLED_APPS
        content = re.sub(
            r'(INSTALLED_APPS\s*=\s*\[)',
            r'\\1\\n    "corsheaders",',
            content
        )
        print("Added corsheaders to INSTALLED_APPS")
    
    # Check if CorsMiddleware is already in MIDDLEWARE
    if 'corsheaders.middleware.CorsMiddleware' not in content:
        # Add CorsMiddleware at the beginning of MIDDLEWARE
        content = re.sub(
            r'(MIDDLEWARE\s*=\s*\[)',
            r'\\1\\n    "corsheaders.middleware.CorsMiddleware",',
            content
        )
        print("Added CorsMiddleware to MIDDLEWARE")
    
    # Add CORS settings at the end
    cors_settings = """

# CORS Configuration
import os

CORS_ALLOWED_ORIGINS = [
    "https://dottapps.com",
    "https://www.dottapps.com",
    "https://localhost:3000",
    "http://localhost:3000"
]

CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization", 
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-tenant-id",
    "x-business-id", 
    "x-schema-name",
    "x-data-source",
    "x-database-only",
    "x-cognito-sub",
    "x-onboarding-status",
    "x-setup-done",
    "x-request-id"
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET", 
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT"
]

CORS_ALLOW_CREDENTIALS = True
CORS_MAX_AGE = 86400
"""
    
    # Add CORS settings if not already present
    if 'CORS_ALLOWED_ORIGINS' not in content:
        content += cors_settings
        print("Added CORS settings")
    
    # Write back the modified settings
    with open(settings_file, 'w') as f:
        f.write(content)
    
    print("Successfully updated Django settings")
    return True

if __name__ == "__main__":
    inject_cors_settings()
EOF

# Copy the script into the container and run it
docker cp /tmp/cors_injection.py $CONTAINER_ID:/tmp/cors_injection.py
docker exec $CONTAINER_ID python /tmp/cors_injection.py

# Restart the Django application
echo "Restarting Django application..."
docker restart $CONTAINER_ID

echo "=== CORS Configuration Complete ==="
'''
    
    try:
        # Send the command
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName='AWS-RunShellScript',
            Parameters={
                'commands': [command_text]
            },
            TimeoutSeconds=300
        )
        
        command_id = response['Command']['CommandId']
        print(f"Sent SSM command: {command_id}")
        
        # Wait for completion
        max_attempts = 30
        for attempt in range(max_attempts):
            try:
                result = ssm.get_command_invocation(
                    CommandId=command_id,
                    InstanceId=instance_id
                )
                
                status = result['Status']
                print(f"Command status: {status}")
                
                if status == 'Success':
                    print("✅ CORS configuration successful!")
                    print("Output:", result.get('StandardOutputContent', ''))
                    return True
                elif status == 'Failed':
                    print("❌ CORS configuration failed!")
                    print("Error:", result.get('StandardErrorContent', ''))
                    return False
                elif status in ['InProgress', 'Pending']:
                    time.sleep(5)
                    continue
                else:
                    print(f"Unexpected status: {status}")
                    return False
                    
            except ssm.exceptions.InvocationDoesNotExist:
                time.sleep(2)
                continue
        
        print("❌ Command timed out")
        return False
        
    except Exception as e:
        print(f"Error sending SSM command: {e}")
        return False

if __name__ == "__main__":
    success = inject_cors_via_ssm()
    if success:
        print("\n🎉 CORS configuration completed successfully!")
        print("Your Django backend should now allow all required headers.")
    else:
        print("\n❌ CORS configuration failed. Check the logs above.") 