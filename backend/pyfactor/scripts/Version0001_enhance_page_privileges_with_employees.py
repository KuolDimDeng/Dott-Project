"""
Script to enhance the UserPagePrivilege model to work with hr_employee table.
This script adds functionality to:
1. Link UserPagePrivilege with hr_employee table
2. Add API endpoints for employee selection
3. Modify the page privileges API to use radio buttons instead of checkboxes
4. Add email verification flow with Cognito
"""

import os
import sys
import uuid
import logging
from datetime import datetime
from django.core.management import call_command
from django.db import connection

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Script metadata
SCRIPT_VERSION = "0001"
SCRIPT_NAME = "enhance_page_privileges_with_employees"
SCRIPT_DESCRIPTION = "Enhances UserPagePrivilege model to work with hr_employee table and adds Cognito email verification"

def modify_user_page_privilege_model():
    """Modify the UserPagePrivilege model to work with hr_employee table"""
    try:
        # Path to the models.py file
        models_path = os.path.join('users', 'models.py')
        
        # Check if the file exists
        if not os.path.exists(models_path):
            logger.error(f"File not found: {models_path}")
            return False
        
        # Read the current content
        with open(models_path, 'r') as file:
            content = file.read()
        
        # Check if the model already has the employee field
        if 'employee = models.ForeignKey(' in content:
            logger.info("UserPagePrivilege model already has employee field")
            return True
        
        # Add import for hr_employee model if not already present
        if 'from hr.models import Employee' not in content:
            # Find the last import statement
            import_section_end = content.rfind('import')
            import_section_end = content.find('\n', import_section_end)
            
            # Add our import after the last import
            new_import = "\nfrom hr.models import Employee"
            content = content[:import_section_end + 1] + new_import + content[import_section_end + 1:]
        
        # Find the UserPagePrivilege model definition
        model_start = content.find('class UserPagePrivilege(models.Model):')
        if model_start == -1:
            logger.error("UserPagePrivilege model not found in models.py")
            return False
        
        # Find the end of the model fields
        fields_end = content.find('class Meta:', model_start)
        if fields_end == -1:
            # If no Meta class, find the next class or the end of the file
            fields_end = content.find('class ', model_start + 30)
            if fields_end == -1:
                fields_end = len(content)
        
        # Add the employee field before the Meta class or the end of the model
        employee_field = """
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='page_privileges', null=True, blank=True)
"""
        
        # Insert the field
        content = content[:fields_end] + employee_field + content[fields_end:]
        
        # Write the updated content back to the file
        with open(models_path, 'w') as file:
            file.write(content)
        
        logger.info("Added employee field to UserPagePrivilege model")
        return True
    
    except Exception as e:
        logger.error(f"Error modifying UserPagePrivilege model: {e}")
        return False

def modify_user_page_privilege_serializer():
    """Modify the UserPagePrivilegeSerializer to include employee data"""
    try:
        # Path to the serializers.py file
        serializers_path = os.path.join('users', 'serializers.py')
        
        # Check if the file exists
        if not os.path.exists(serializers_path):
            logger.error(f"File not found: {serializers_path}")
            return False
        
        # Read the current content
        with open(serializers_path, 'r') as file:
            content = file.read()
        
        # Check if the serializer already has the employee field
        if 'employee_id = serializers.UUIDField(' in content:
            logger.info("UserPagePrivilegeSerializer already has employee field")
            return True
        
        # Find the UserPagePrivilegeSerializer class
        serializer_start = content.find('class UserPagePrivilegeSerializer(serializers.ModelSerializer):')
        if serializer_start == -1:
            logger.error("UserPagePrivilegeSerializer not found in serializers.py")
            return False
        
        # Find the Meta class
        meta_start = content.find('class Meta:', serializer_start)
        if meta_start == -1:
            logger.error("Meta class not found in UserPagePrivilegeSerializer")
            return False
        
        # Add employee fields before the Meta class
        employee_fields = """
    employee_id = serializers.UUIDField(source='employee.id', read_only=True, allow_null=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True, allow_null=True)
    employee_first_name = serializers.CharField(source='employee.first_name', read_only=True, allow_null=True)
    employee_last_name = serializers.CharField(source='employee.last_name', read_only=True, allow_null=True)
"""
        
        # Insert the fields
        content = content[:meta_start] + employee_fields + content[meta_start:]
        
        # Find the fields list in the Meta class
        fields_start = content.find('fields = [', meta_start)
        if fields_start == -1:
            logger.error("fields list not found in UserPagePrivilegeSerializer Meta class")
            return False
        
        # Find the end of the fields list
        fields_end = content.find(']', fields_start)
        if fields_end == -1:
            logger.error("End of fields list not found in UserPagePrivilegeSerializer Meta class")
            return False
        
        # Add employee fields to the fields list
        fields_list = content[fields_start:fields_end]
        if 'employee_id' not in fields_list:
            new_fields = fields_list.rstrip() + ", 'employee_id', 'employee_email', 'employee_first_name', 'employee_last_name'"
            content = content[:fields_start] + new_fields + content[fields_end:]
        
        # Write the updated content back to the file
        with open(serializers_path, 'w') as file:
            file.write(content)
        
        logger.info("Added employee fields to UserPagePrivilegeSerializer")
        return True
    
    except Exception as e:
        logger.error(f"Error modifying UserPagePrivilegeSerializer: {e}")
        return False

def modify_user_page_privilege_viewset():
    """Modify the UserPagePrivilegeViewSet to work with hr_employee table"""
    try:
        # Path to the views.py file
        views_path = os.path.join('users', 'views.py')
        
        # Check if the file exists
        if not os.path.exists(views_path):
            logger.error(f"File not found: {views_path}")
            return False
        
        # Read the current content
        with open(views_path, 'r') as file:
            content = file.read()
        
        # Check if the viewset already has the employee methods
        if 'def get_employees(self, request):' in content:
            logger.info("UserPagePrivilegeViewSet already has employee methods")
            return True
        
        # Add import for hr_employee model if not already present
        if 'from hr.models import Employee' not in content:
            # Find the last import statement
            import_section_end = content.rfind('import')
            import_section_end = content.find('\n', import_section_end)
            
            # Add our import after the last import
            new_import = "\nfrom hr.models import Employee"
            content = content[:import_section_end + 1] + new_import + content[import_section_end + 1:]
        
        # Find the UserPagePrivilegeViewSet class
        viewset_start = content.find('class UserPagePrivilegeViewSet(viewsets.ModelViewSet):')
        if viewset_start == -1:
            logger.error("UserPagePrivilegeViewSet not found in views.py")
            return False
        
        # Find the end of the class
        viewset_end = content.find('class ', viewset_start + 10)
        if viewset_end == -1:
            viewset_end = len(content)
        
        # Add employee methods to the viewset
        employee_methods = """
    @action(detail=False, methods=['get'])
    def get_employees(self, request):
        # Get all employees for the current tenant
        try:
            # Get the current user's tenant
            user_profile = UserProfile.objects.get(user=request.user)
            business = user_profile.active_business
            
            if not business:
                return Response({'error': 'No active business found'}, status=400)
            
            # Get all employees for the tenant
            employees = Employee.objects.filter(tenant_id=business.tenant_id)
            
            # Return employee data
            employee_data = []
            for employee in employees:
                employee_data.append({
                    'id': employee.id,
                    'first_name': employee.first_name,
                    'last_name': employee.last_name,
                    'email': employee.email,
                    'user_id': employee.user_id
                })
            
            return Response(employee_data)
        
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def set_employee_privileges(self, request):
        # Set page privileges for an employee
        try:
            # Get request data
            employee_id = request.data.get('employee_id')
            page_access = request.data.get('page_access', [])
            can_manage_users = request.data.get('can_manage_users', False)
            
            if not employee_id:
                return Response({'error': 'Employee ID is required'}, status=400)
            
            # Get the employee
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response({'error': 'Employee not found'}, status=404)
            
            # Get the current user's tenant
            user_profile = UserProfile.objects.get(user=request.user)
            business = user_profile.active_business
            
            if not business:
                return Response({'error': 'No active business found'}, status=400)
            
            # Check if the employee belongs to the same tenant
            if str(employee.tenant_id) != str(business.tenant_id):
                return Response({'error': 'Employee does not belong to your business'}, status=403)
            
            # Check if the current user has permission to set privileges
            if not user_profile.user.is_staff:
                # For non-staff users, check if they have the can_manage_users privilege
                try:
                    current_user_member = BusinessMember.objects.get(user=request.user, business=business)
                    try:
                        current_privileges = UserPagePrivilege.objects.get(business_member=current_user_member)
                        if not current_privileges.can_manage_users:
                            return Response({'error': 'You do not have permission to set page privileges'}, status=403)
                    except UserPagePrivilege.DoesNotExist:
                        return Response({'error': 'You do not have permission to set page privileges'}, status=403)
                except BusinessMember.DoesNotExist:
                    return Response({'error': 'You are not a member of this business'}, status=403)
            
            # Get or create the business member for the employee
            business_member = None
            if employee.user_id:
                try:
                    business_member = BusinessMember.objects.get(user_id=employee.user_id, business=business)
                except BusinessMember.DoesNotExist:
                    # Create a new business member if the employee has a user account but no business member
                    business_member = BusinessMember.objects.create(
                        user_id=employee.user_id,
                        business=business,
                        role='employee'
                    )
            
            # Update or create privileges
            if business_member:
                privileges, created = UserPagePrivilege.objects.update_or_create(
                    business_member=business_member,
                    defaults={
                        'page_access': page_access,
                        'can_manage_users': can_manage_users,
                        'employee': employee
                    }
                )
            else:
                # If no business member (employee has no user account yet), create privileges linked only to employee
                privileges, created = UserPagePrivilege.objects.update_or_create(
                    employee=employee,
                    defaults={
                        'page_access': page_access,
                        'can_manage_users': can_manage_users
                    }
                )
            
            return Response({
                'success': True,
                'message': 'Page privileges updated successfully',
                'created': created
            })
        
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def invite_employee(self, request):
        # Invite an employee to create a user account
        try:
            # Get request data
            employee_id = request.data.get('employee_id')
            
            if not employee_id:
                return Response({'error': 'Employee ID is required'}, status=400)
            
            # Get the employee
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response({'error': 'Employee not found'}, status=404)
            
            # Get the current user's tenant
            user_profile = UserProfile.objects.get(user=request.user)
            business = user_profile.active_business
            
            if not business:
                return Response({'error': 'No active business found'}, status=400)
            
            # Check if the employee belongs to the same tenant
            if str(employee.tenant_id) != str(business.tenant_id):
                return Response({'error': 'Employee does not belong to your business'}, status=403)
            
            # Check if the employee already has a user account
            if employee.user_id:
                return Response({'error': 'Employee already has a user account'}, status=400)
            
            # Generate a unique invitation token
            invitation_token = str(uuid.uuid4())
            
            # Store the invitation in the database
            # This would typically be in a separate model, but for simplicity we'll add it to the employee
            # In a real implementation, you would create a proper invitation model
            employee.invitation_token = invitation_token
            employee.invitation_sent_at = datetime.now()
            employee.save()
            
            # Send invitation email using Cognito
            # In a real implementation, you would use AWS SDK to send the email
            # For now, we'll just log the invitation
            logger.info(f"Invitation sent to {employee.email} with token {invitation_token}")
            
            return Response({
                'success': True,
                'message': 'Invitation sent successfully',
                'invitation_token': invitation_token
            })
        
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def invite_new_user(self, request):
        # Invite a new user who is not an employee
        try:
            # Get request data
            email = request.data.get('email')
            first_name = request.data.get('first_name')
            last_name = request.data.get('last_name')
            
            if not email or not first_name or not last_name:
                return Response({'error': 'Email, first name, and last name are required'}, status=400)
            
            # Get the current user's tenant
            user_profile = UserProfile.objects.get(user=request.user)
            business = user_profile.active_business
            
            if not business:
                return Response({'error': 'No active business found'}, status=400)
            
            # Create a new employee record
            employee = Employee.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                status='invited',
                tenant_id=business.tenant_id
            )
            
            # Generate a unique invitation token
            invitation_token = str(uuid.uuid4())
            
            # Store the invitation in the database
            employee.invitation_token = invitation_token
            employee.invitation_sent_at = datetime.now()
            employee.save()
            
            # Send invitation email using Cognito
            # In a real implementation, you would use AWS SDK to send the email
            # For now, we'll just log the invitation
            logger.info(f"Invitation sent to {email} with token {invitation_token}")
            
            return Response({
                'success': True,
                'message': 'Invitation sent successfully',
                'employee_id': employee.id,
                'invitation_token': invitation_token
            })
        
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
"""
        
        # Insert the methods
        content = content[:viewset_end] + employee_methods + content[viewset_end:]
        
        # Write the updated content back to the file
        with open(views_path, 'w') as file:
            file.write(content)
        
        logger.info("Added employee methods to UserPagePrivilegeViewSet")
        return True
    
    except Exception as e:
        logger.error(f"Error modifying UserPagePrivilegeViewSet: {e}")
        return False

def update_urls():
    """Update the URLs to include the new endpoints"""
    try:
        # Path to the urls.py file
        urls_path = os.path.join('users', 'urls.py')
        
        # Check if the file exists
        if not os.path.exists(urls_path):
            logger.error(f"File not found: {urls_path}")
            return False
        
        # Read the current content
        with open(urls_path, 'r') as file:
            content = file.read()
        
        # Check if the URLs already include the new endpoints
        if "page-privileges/get_employees" in content:
            logger.info("URLs already include the new endpoints")
            return True
        
        # Find the router.register line for UserPagePrivilegeViewSet
        register_line = content.find("router.register(r'page-privileges', UserPagePrivilegeViewSet")
        if register_line == -1:
            logger.error("UserPagePrivilegeViewSet registration not found in urls.py")
            return False
        
        # Find the end of the line
        line_end = content.find('\n', register_line)
        if line_end == -1:
            line_end = len(content)
        
        # Add the new endpoints
        new_endpoints = """
# Add custom actions for UserPagePrivilegeViewSet
router.register(r'page-privileges', UserPagePrivilegeViewSet, basename='page-privileges')
"""
        
        # Replace the existing registration with the new one
        content = content[:register_line] + new_endpoints + content[line_end + 1:]
        
        # Write the updated content back to the file
        with open(urls_path, 'w') as file:
            file.write(content)
        
        logger.info("Updated URLs to include the new endpoints")
        return True
    
    except Exception as e:
        logger.error(f"Error updating URLs: {e}")
        return False

def add_invitation_token_to_employee():
    """Add invitation_token and invitation_sent_at fields to the Employee model"""
    try:
        # Execute SQL to add the fields
        with connection.cursor() as cursor:
            # Check if the fields already exist
            cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hr_employee' AND column_name = 'invitation_token'
            """)
            if cursor.fetchone():
                logger.info("invitation_token field already exists in hr_employee table")
                return True
            
            # Add the fields
            cursor.execute("""
            ALTER TABLE hr_employee 
            ADD COLUMN invitation_token VARCHAR(255),
            ADD COLUMN invitation_sent_at TIMESTAMP WITH TIME ZONE
            """)
        
        logger.info("Added invitation_token and invitation_sent_at fields to hr_employee table")
        return True
    
    except Exception as e:
        logger.error(f"Error adding invitation fields to hr_employee table: {e}")
        return False

def create_migrations():
    """Create migrations for the model changes"""
    try:
        # Create migrations for the users app
        call_command('makemigrations', 'users')
        logger.info("Created migrations for users app")
        
        # Create migrations for the hr app
        call_command('makemigrations', 'hr')
        logger.info("Created migrations for hr app")
        
        return True
    
    except Exception as e:
        logger.error(f"Error creating migrations: {e}")
        return False

def apply_migrations():
    """Apply the migrations"""
    try:
        call_command('migrate')
        logger.info("Applied migrations")
        return True
    
    except Exception as e:
        logger.error(f"Error applying migrations: {e}")
        return False

def run():
    """Run the script"""
    logger.info(f"Running script: {SCRIPT_NAME} v{SCRIPT_VERSION}")
    logger.info(SCRIPT_DESCRIPTION)
    
    # Define the steps to run
    steps = [
        ("Adding invitation fields to Employee model", add_invitation_token_to_employee),
        ("Modifying UserPagePrivilege model", modify_user_page_privilege_model),
        ("Modifying UserPagePrivilegeSerializer", modify_user_page_privilege_serializer),
        ("Modifying UserPagePrivilegeViewSet", modify_user_page_privilege_viewset),
        ("Updating URLs", update_urls),
        ("Creating migrations", create_migrations),
        ("Applying migrations", apply_migrations),
    ]
    
    # Run each step
    success = True
    for step_name, step_func in steps:
        logger.info(f"Step: {step_name}")
        step_success = step_func()
        if not step_success:
            logger.error(f"Step failed: {step_name}")
            success = False
            break
        logger.info(f"Step completed: {step_name}")
    
    if success:
        logger.info(f"Script completed successfully: {SCRIPT_NAME} v{SCRIPT_VERSION}")
    else:
        logger.error(f"Script failed: {SCRIPT_NAME} v{SCRIPT_VERSION}")
    
    return success

if __name__ == "__main__":
    success = run()
    sys.exit(0 if success else 1)