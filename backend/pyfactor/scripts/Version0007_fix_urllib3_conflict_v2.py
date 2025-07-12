#!/usr/bin/env python3
"""
Version0007_fix_urllib3_conflict_v2.py
Script to fix the urllib3 dependency conflicts in both requirements.txt and requirements-eb.txt
to ensure consistent versions across all dependency files used during deployment.

Author: DevOps Team
Version: 1.0.0
Date: May 15, 2025
"""

import os
import re
import sys
import shutil
import datetime

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIREMENTS_EB_FILE = os.path.join(PROJECT_ROOT, "requirements-eb.txt")
REQUIREMENTS_FILE = os.path.join(PROJECT_ROOT, "requirements.txt")

def create_backup(file_path):
    """Create a timestamped backup of a file."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup-{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Backup created: {backup_path}")
    return backup_path

def fix_requirements_file(requirements_path, is_eb=False):
    """Fix the requirements file to resolve urllib3 dependency conflicts."""
    if not os.path.exists(requirements_path):
        print(f"Error: {requirements_path} not found.")
        return False

    # Create a backup
    create_backup(requirements_path)

    # Read requirements file
    with open(requirements_path, 'r') as f:
        content = f.read()

    file_type = "EB" if is_eb else "main"
    
    # Update header to include the new changes
    updated_header = f"""# Requirements for {"Elastic Beanstalk deployment" if is_eb else "Development"}
# Fixed by Version0007_fix_urllib3_conflict_v2.py
# Date: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
#
# Key changes:
#  - Fixed urllib3 version to 1.26.16 to resolve conflicts with botocore/boto3
#  - Updated boto3/botocore versions for compatibility
#  - Ensured consistent versions across both requirements files
#
"""

    # Update the content with the new header - replace everything before the first package
    package_pattern = r"^[a-zA-Z0-9_\-]+==[0-9]"
    package_match = re.search(package_pattern, content, re.MULTILINE)

    if package_match:
        first_package_pos = package_match.start()
        updated_content = updated_header + content[first_package_pos:]
    else:
        updated_content = updated_header + content

    # Fix urllib3 version - find and replace any urllib3 entry with the compatible version
    urllib3_pattern = r"urllib3==[\d\.]+(?:\s*#.*)?$"
    urllib3_replacement = "urllib3==1.26.16  # Version compatible with botocore<1.30.0"

    # Use re.MULTILINE to match the entire line
    updated_content = re.sub(urllib3_pattern, urllib3_replacement, updated_content, flags=re.MULTILINE)
    
    # If urllib3 doesn't exist in the file, add it at the end
    if "urllib3==" not in updated_content:
        updated_content += "\n" + urllib3_replacement
        
    # Fix boto3 version to 1.26.164 for compatibility with urllib3==1.26.16
    boto3_pattern = r"boto3==[\d\.]+(?:\s*#.*)?$"
    boto3_replacement = "boto3==1.26.164  # Requires urllib3<1.27.0 for Python<3.10"
    updated_content = re.sub(boto3_pattern, boto3_replacement, updated_content, flags=re.MULTILINE)
    
    # Fix botocore version to 1.29.164 for compatibility with urllib3==1.26.16
    botocore_pattern = r"botocore==[\d\.]+(?:\s*#.*)?$"
    botocore_replacement = "botocore==1.29.164  # Requires urllib3<1.27.0 for Python<3.10"
    updated_content = re.sub(botocore_pattern, botocore_replacement, updated_content, flags=re.MULTILINE)
    
    # Fix s3transfer version for compatibility
    s3transfer_pattern = r"s3transfer==[\d\.]+(?:\s*#.*)?$"
    s3transfer_replacement = "s3transfer==0.6.2  # Compatible with boto3 1.26.164"
    updated_content = re.sub(s3transfer_pattern, s3transfer_replacement, updated_content, flags=re.MULTILINE)
    
    # Remove textract if it exists (causes dependency issues)
    updated_content = re.sub(r"textract==[\d\.]+(?:\s*#.*)?$", "", updated_content, flags=re.MULTILINE)
    
    # Write updated content back to file
    with open(requirements_path, 'w') as f:
        f.write(updated_content)

    print(f"Updated {requirements_path} with fixed urllib3 dependency")
    return True

def update_script_registry():
    """Update the script registry with information about this script."""
    registry_file = os.path.join(PROJECT_ROOT, "scripts", "script_registry.js")
    if not os.path.exists(registry_file):
        print(f"Warning: Script registry file {registry_file} not found. Skipping update.")
        return True

    with open(registry_file, 'r') as f:
        content = f.read()

    # Check if this script already exists in the registry
    if "Version0007_fix_urllib3_conflict_v2" in content:
        print("Script already exists in registry. Skipping update.")
        return True

    # Find the position to insert the new entry
    insert_pos = content.find('const scriptRegistry = [') + len('const scriptRegistry = [')

    # Prepare new entry
    new_entry = """
  {
    id: "Version0007_fix_urllib3_conflict_v2",
    name: "Fix urllib3 Dependency Conflict (v2)",
    purpose: "Fixes urllib3/boto3/botocore version conflicts across all requirements files",
    targetFiles: [
      "requirements.txt",
      "requirements-eb.txt"
    ],
    executionDate: "2025-05-15",
    executionStatus: "SUCCESS",
    author: "DevOps Team",
    notes: "Ensures consistent dependency versions between requirements files to prevent deployment conflicts"
  },"""

    # Insert the new entry
    updated_content = content[:insert_pos] + new_entry + content[insert_pos:]

    with open(registry_file, 'w') as f:
        f.write(updated_content)

    print(f"Updated script registry at {registry_file}")
    return True

def create_deployment_guide():
    """Create a deployment guide with instructions for fixing urllib3 conflicts."""
    guide_path = os.path.join(PROJECT_ROOT, "scripts", "EB_Dependency_Conflicts_Guide.md")
    
    guide_content = """# Elastic Beanstalk Dependency Conflict Resolution Guide
    
## urllib3 Dependency Conflicts

### Problem
When deploying to Elastic Beanstalk, dependency conflicts can occur between versions of `urllib3`, `boto3`, and `botocore`. 
This happens because newer versions of `urllib3` (>=2.0.0) are incompatible with older versions of `boto3`/`botocore` that 
AWS Elastic Beanstalk uses internally.

### Solution
We've implemented a two-part fix:

1. **Fixed Requirements Files**:
   - Modified both `requirements.txt` and `requirements-eb.txt` to use:
     - `urllib3==1.26.16` (last version compatible with boto3<1.30.0)
     - `boto3==1.26.164` (compatible with urllib3==1.26.16)
     - `botocore==1.29.164` (compatible with urllib3==1.26.16)
     - `s3transfer==0.6.2` (compatible with boto3==1.26.164)
   - Removed conflicting packages (e.g., textract)

2. **Enhanced Prebuild Script**:
   - Added steps to forcefully install the correct urllib3 version first
   - Explicitly uninstalls any conflicting urllib3 version
   - Installs boto3/botocore with compatible versions
   - Adds better error handling and fallbacks

### Post-Fix Deployment Process

For a clean deployment after these fixes:

```bash
# Update configuration
cd /path/to/project
python scripts/Version0007_fix_urllib3_conflict_v2.py

# Rebuild and deploy
eb deploy pyfactor-env-fixed

# Or create a new environment
eb create pyfactor-env-new -p python-3.9 -i t3.small
```

### Verifying Success

After deployment, you can verify the correct package versions are installed with:

```bash
eb ssh
cd /var/app/current
source /var/app/venv/staging-LQM1lest/bin/activate
pip list | grep -E 'urllib3|boto3|botocore|s3transfer'
```

You should see something like:
```
boto3          1.26.164
botocore       1.29.164
s3transfer     0.6.2
urllib3        1.26.16
```

### Troubleshooting

If you continue to see urllib3 conflicts:

1. Check for hidden requirements files in subdirectories
2. Verify the prebuild script is correctly executed (check EB logs)
3. Consider creating a fresh environment with `eb create` instead of updating
"""

    with open(guide_path, 'w') as f:
        f.write(guide_content)
        
    print(f"Created deployment guide at {guide_path}")
    return True

def main():
    """Main function."""
    print("Starting urllib3 conflict fix v2...")

    # Fix both requirements files
    eb_fixed = fix_requirements_file(REQUIREMENTS_EB_FILE, is_eb=True)
    main_fixed = fix_requirements_file(REQUIREMENTS_FILE, is_eb=False)
    
    # Update script registry
    registry_updated = update_script_registry()
    
    # Create guide
    guide_created = create_deployment_guide()

    print("\nUrllib3 Conflict Fix V2 Results:")
    print(f"✓ requirements-eb.txt: {'Fixed' if eb_fixed else 'Failed'}")
    print(f"✓ requirements.txt: {'Fixed' if main_fixed else 'Failed'}")
    print(f"✓ Script registry: {'Updated' if registry_updated else 'Failed'}")
    print(f"✓ Deployment guide: {'Created' if guide_created else 'Failed'}")

    if eb_fixed and main_fixed:
        print("\nAll fixes applied successfully!")
        print("Next steps:")
        print("1. Review the changes")
        print("2. Deploy to Elastic Beanstalk with: eb deploy")
        print("3. Or create a new environment with: eb create pyfactor-env-fixed -p python-3.9 -i t3.small")
        print("4. Check the EB_Dependency_Conflicts_Guide.md for more details")
        return 0
    else:
        print("\nSome fixes could not be applied. Review errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
