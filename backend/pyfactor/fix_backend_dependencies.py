#!/usr/bin/env python3
"""
Fix Backend Dependencies Script
Installs missing packages that are required for production
"""

import subprocess
import sys

def install_package(package):
    """Install a package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {package}: {e}")
        return False

def main():
    """Install all missing critical packages"""
    critical_packages = [
        "sentry-sdk[django]==2.19.2",
        "posthog==6.0.0", 
        "django-cors-headers==4.7.0",
        "python-json-logger==2.0.7"
    ]
    
    print("🔧 Installing critical backend dependencies...")
    
    success_count = 0
    for package in critical_packages:
        if install_package(package):
            success_count += 1
    
    print(f"\n📊 Installation Summary:")
    print(f"   Successful: {success_count}/{len(critical_packages)}")
    
    if success_count == len(critical_packages):
        print("✅ All critical packages installed successfully!")
        print("🚀 Backend should now work properly.")
    else:
        print("⚠️ Some packages failed to install.")
        print("💡 You may need to install them manually in production.")

if __name__ == "__main__":
    main()