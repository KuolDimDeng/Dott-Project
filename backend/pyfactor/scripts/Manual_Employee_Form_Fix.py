#!/usr/bin/env python
"""
Manual_Employee_Form_Fix.py

Purpose:
    This script directly fixes the employee form issues:
    1. Ensures the date_joined field is properly included and defaults to current date
    2. Sets role to 'user' for all new employees in the backend
    3. Updates form initialization to include required fields

Date: April 22, 2025
Author: AI Assistant
Version: 1.0
"""

import os
import sys
import logging
import shutil
import datetime
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                        'manual_employee_form_fix.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def create_backup(file_path):
    """Create a backup of the file"""
    backup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"{os.path.basename(file_path)}.{timestamp}.bak"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    try:
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup at {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create backup: {str(e)}")
        return False

def fix_backend_views():
    """Fix the employee creation in hr/views.py to properly set role='user'"""
    hr_views_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'hr', 'views.py'
    )
    
    if not os.path.exists(hr_views_path):
        logger.error(f"Target file not found: {hr_views_path}")
        return False
    
    if not create_backup(hr_views_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file
        with open(hr_views_path, 'r') as f:
            lines = f.readlines()
        
        # Make sure there's an import for datetime
        import_datetime_found = False
        for line in lines:
            if "from datetime import datetime" in line:
                import_datetime_found = True
                break
        
        # Locate the employee_list function and modify it
        in_employee_list = False
        modified_lines = []
        
        # Add datetime import if needed
        for i, line in enumerate(lines):
            if not import_datetime_found and "import " in line and i < 20:  # Add to top imports
                if i > 0 and "from datetime import" in lines[i-1]:
                    # Already has some datetime imports, append to it
                    pass
                else:
                    modified_lines.append("from datetime import datetime\n")
                    import_datetime_found = True
            
            modified_lines.append(line)
            
            # Track if we're inside the employee_list function
            if "def employee_list(request):" in line:
                in_employee_list = True
            elif in_employee_list and line.strip().startswith("def "):
                in_employee_list = False
            
            # Add our fix after the serializer.is_valid line to set default date
            if in_employee_list and "if serializer.is_valid():" in line:
                i = len(modified_lines)
                next_line = lines[i] if i < len(lines) else ""
                if "# Always set today's date for date_joined" not in next_line:
                    modified_lines.append("            # Always set today's date for date_joined\n")
                    modified_lines.append("            data = request.data.copy()\n")
                    modified_lines.append("            if not data.get('date_joined'):\n")
                    modified_lines.append("                data['date_joined'] = datetime.now().strftime('%Y-%m-%d')\n")
                    modified_lines.append("            serializer = EmployeeSerializer(data=data)\n")
                    modified_lines.append("            if not serializer.is_valid():\n")
                    modified_lines.append("                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)\n")
            
            # Add our fix after the serializer.save line
            if in_employee_list and "employee = serializer.save" in line:
                # The line number after serializer.save where we want to add our fix
                idx = len(modified_lines)
                
                # Check if the role='user' line is already there
                next_lines = "".join(lines[idx:idx+10])
                if "employee.role = \"user\"" not in next_lines:
                    modified_lines.append("            # Ensure role is always set to 'user' for employees\n")
                    modified_lines.append("            employee.role = \"user\"\n")
                    modified_lines.append("            employee.save()\n")
        
        # Save the modified file
        with open(hr_views_path, 'w') as f:
            f.writelines(modified_lines)
        
        logger.info("Successfully fixed hr/views.py")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing hr/views.py: {str(e)}")
        return False

def fix_employee_serializer():
    """Update the Employee serializer to set defaults for required fields"""
    hr_serializers_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'hr', 'serializers.py'
    )
    
    if not os.path.exists(hr_serializers_path):
        logger.error(f"Target file not found: {hr_serializers_path}")
        return False
    
    if not create_backup(hr_serializers_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file
        with open(hr_serializers_path, 'r') as f:
            content = f.read()
        
        # Check if create method already exists
        create_method_exists = "def create(self, validated_data):" in content
        
        # Add or update the create method to set default values
        if create_method_exists:
            # Find the create method and modify it
            import re
            create_pattern = r"def create\(self, validated_data\):.*?return employee"
            create_method = re.search(create_pattern, content, re.DOTALL)
            
            if create_method:
                old_create = create_method.group(0)
                # Add role and date_joined to the create method
                new_create = old_create.replace(
                    "employee = Employee.objects.create(**validated_data)",
                    "# Set defaults for required fields\n"
                    "        if 'role' not in validated_data or not validated_data['role']:\n"
                    "            validated_data['role'] = 'user'\n"
                    "        from datetime import datetime\n"
                    "        # Always set date_joined to current date if not provided\n"
                    "        if 'date_joined' not in validated_data or not validated_data['date_joined']:\n"
                    "            validated_data['date_joined'] = datetime.now().date()\n"
                    "        employee = Employee.objects.create(**validated_data)"
                )
                modified_content = content.replace(old_create, new_create)
            else:
                logger.error("Could not parse create method in serializer")
                return False
        else:
            # Add the create method
            create_method = """
    def create(self, validated_data):
        # Set defaults for required fields
        if 'role' not in validated_data or not validated_data['role']:
            validated_data['role'] = 'user'
            
        from datetime import datetime
        # Always set date_joined to current date if not provided
        if 'date_joined' not in validated_data or not validated_data['date_joined']:
            validated_data['date_joined'] = datetime.now().date()
            
        # Create the employee
        employee = Employee.objects.create(**validated_data)
        
        # Handle any other post-creation logic from original create method
        request = self.context.get('request')
        if request and request.data.get('security_number'):
            employee.save_ssn_to_stripe(request.data.get('security_number'))
            
        if request and request.data.get('bank_account_number') and request.data.get('routing_number'):
            employee.save_bank_account_to_stripe(
                request.data.get('bank_account_number'),
                request.data.get('routing_number')
            )
            
        return employee
"""
            # Find a good position to add the create method
            to_internal_value_pos = content.find("def to_internal_value")
            if to_internal_value_pos != -1:
                modified_content = content[:to_internal_value_pos] + create_method + content[to_internal_value_pos:]
            else:
                # Add at the end of EmployeeSerializer class
                class_end = content.find("class RoleSerializer")
                if class_end != -1:
                    modified_content = content[:class_end] + create_method + content[class_end:]
                else:
                    logger.error("Could not find a good position to add create method")
                    return False
        
        # Save the modified file
        with open(hr_serializers_path, 'w') as f:
            f.write(modified_content)
        
        logger.info("Successfully fixed hr/serializers.py")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing hr/serializers.py: {str(e)}")
        return False

def update_model_defaults():
    """Update the Employee model to have proper default for date_joined"""
    model_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'hr', 'models.py'
    )
    
    if not os.path.exists(model_path):
        logger.error(f"Target file not found: {model_path}")
        return False
    
    if not create_backup(model_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file
        with open(model_path, 'r') as f:
            content = f.read()
        
        # Fix the date_joined field default
        import re
        date_joined_pattern = r'date_joined = models\.DateField\([^)]*\)'
        
        # Check if the field is found
        match = re.search(date_joined_pattern, content)
        if match:
            old_field = match.group(0)
            # Replace with explicit default=timezone.now
            new_field = 'date_joined = models.DateField(default=timezone.now)'
            modified_content = content.replace(old_field, new_field)
            
            # Save the modified file
            with open(model_path, 'w') as f:
                f.write(modified_content)
            
            logger.info("Successfully updated Employee model defaults")
            return True
        else:
            logger.warning("Could not find date_joined field in model")
            return False
        
    except Exception as e:
        logger.error(f"Error updating model defaults: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("Starting manual employee form fix script")
    
    # Execute the fixes
    backend_fixed = fix_backend_views()
    serializer_fixed = fix_employee_serializer()
    model_fixed = update_model_defaults()
    
    if backend_fixed and serializer_fixed and model_fixed:
        logger.info("Successfully fixed employee form issues")
    else:
        logger.warning("Some fixes completed, others may have failed. Check the logs.")

if __name__ == "__main__":
    main() 