#!/usr/bin/env python3
"""
Django CORS Headers Configuration Fix for Production
Updates CORS settings via Elastic Beanstalk environment variables
"""

import json
import subprocess
import sys
from datetime import datetime

def main():
    print("🔧 Configuring Django CORS Headers for Production...")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Define the environment variables for Django CORS configuration
    cors_settings = [
        {
            "Namespace": "aws:elasticbeanstalk:application:environment",
            "OptionName": "CORS_ALLOWED_ORIGINS",
            "Value": "https://dottapps.com,https://www.dottapps.com,https://localhost:3000,http://localhost:3000"
        },
        {
            "Namespace": "aws:elasticbeanstalk:application:environment", 
            "OptionName": "CORS_ALLOW_ALL_ORIGINS",
            "Value": "True"
        },
        {
            "Namespace": "aws:elasticbeanstalk:application:environment",
            "OptionName": "CORS_ALLOW_HEADERS",
            "Value": "accept,authorization,content-type,user-agent,x-csrftoken,x-requested-with,x-tenant-id,x-business-id,x-schema-name,x-data-source,x-database-only,x-cognito-sub,x-onboarding-status,x-setup-done,x-request-id,origin,x-forwarded-for,x-forwarded-proto"
        },
        {
            "Namespace": "aws:elasticbeanstalk:application:environment",
            "OptionName": "CORS_ALLOW_METHODS",
            "Value": "DELETE,GET,OPTIONS,PATCH,POST,PUT"
        },
        {
            "Namespace": "aws:elasticbeanstalk:application:environment",
            "OptionName": "CORS_ALLOW_CREDENTIALS",
            "Value": "True"
        },
        {
            "Namespace": "aws:elasticbeanstalk:application:environment",
            "OptionName": "CORS_MAX_AGE",
            "Value": "86400"
        }
    ]
    
    # Write settings to a temporary file
    temp_file = "cors-settings.json"
    with open(temp_file, 'w') as f:
        json.dump(cors_settings, f, indent=2)
    
    print("📝 CORS settings to be applied:")
    for setting in cors_settings:
        print(f"   {setting['OptionName']}: {setting['Value']}")
    
    # Apply the settings to Elastic Beanstalk
    try:
        print("\n🚀 Applying CORS configuration to Elastic Beanstalk...")
        cmd = [
            "aws", "elasticbeanstalk", "update-environment",
            "--environment-name", "Dott-env-fixed",
            "--option-settings", f"file://{temp_file}",
            "--region", "us-east-1"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ CORS configuration applied successfully!")
            response = json.loads(result.stdout)
            print(f"Environment Status: {response.get('Status', 'Unknown')}")
            print(f"Environment Health: {response.get('Health', 'Unknown')}")
            
            print("\n⏳ Environment is updating...")
            print("You can monitor the progress with:")
            print("aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed --region us-east-1")
            
        else:
            print("❌ Failed to apply CORS configuration")
            print(f"Error: {result.stderr}")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error applying CORS configuration: {e}")
        sys.exit(1)
    
    finally:
        # Clean up temporary file
        import os
        if os.path.exists(temp_file):
            os.remove(temp_file)
    
    print("\n🔍 Next steps:")
    print("1. Wait for environment update to complete (5-10 minutes)")
    print("2. Test CORS headers with: curl -X OPTIONS -H 'Origin: https://dottapps.com' https://api.dottapps.com/health/")
    print("3. Verify frontend-backend communication")
    
    print("\n📋 Expected CORS headers after update:")
    print("   - X-Tenant-ID: ✅ Allowed")
    print("   - X-Business-ID: ✅ Allowed") 
    print("   - X-Schema-Name: ✅ Allowed")
    print("   - All standard headers: ✅ Allowed")

if __name__ == "__main__":
    main() 