#!/usr/bin/env python3
"""
Django CORS Headers Configuration Fix for Main Production Backend
Updates CORS settings on DottApps-Max-Security-Fixed environment
"""

import json
import subprocess
import sys
from datetime import datetime

def main():
    print("🔧 Configuring Django CORS Headers for Main Production Backend...")
    print(f"Environment: DottApps-Max-Security-Fixed")
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
    temp_file = "main-backend-cors-settings.json"
    with open(temp_file, 'w') as f:
        json.dump(cors_settings, f, indent=2)
    
    print("📝 CORS settings to be applied to MAIN BACKEND:")
    for setting in cors_settings:
        print(f"   {setting['OptionName']}: {setting['Value']}")
    
    # Apply the settings to the main backend Elastic Beanstalk environment
    try:
        print("\n🚀 Applying CORS configuration to Main Backend (DottApps-Max-Security-Fixed)...")
        cmd = [
            "aws", "elasticbeanstalk", "update-environment",
            "--environment-name", "DottApps-Max-Security-Fixed",
            "--option-settings", f"file://{temp_file}",
            "--region", "us-east-1"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ CORS configuration applied successfully to main backend!")
            response = json.loads(result.stdout)
            print(f"Environment Status: {response.get('Status', 'Unknown')}")
            print(f"Environment Health: {response.get('Health', 'Unknown')}")
            
            print("\n⏳ Main backend environment is updating...")
            print("You can monitor the progress with:")
            print("aws elasticbeanstalk describe-environments --environment-names DottApps-Max-Security-Fixed --region us-east-1")
            
        else:
            print("❌ Failed to apply CORS configuration to main backend")
            print(f"Error: {result.stderr}")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error applying CORS configuration to main backend: {e}")
        sys.exit(1)
    
    finally:
        # Clean up temporary file
        import os
        if os.path.exists(temp_file):
            os.remove(temp_file)
    
    print("\n🔍 Next steps:")
    print("1. Wait for main backend environment update to complete (5-10 minutes)")
    print("2. Update DNS to point api.dottapps.com to DottApps-Max-Security-Fixed")
    print("3. Test CORS headers with the main backend")
    print("4. Verify frontend-backend communication")
    
    print("\n📋 After this update, the main backend will allow:")
    print("   - X-Tenant-ID: ✅ Allowed")
    print("   - X-Business-ID: ✅ Allowed") 
    print("   - X-Schema-Name: ✅ Allowed")
    print("   - All standard headers: ✅ Allowed")

if __name__ == "__main__":
    main() 