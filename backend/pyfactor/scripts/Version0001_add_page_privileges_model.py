#!/usr/bin/env python
"""
Script to add UserPagePrivilege model to the users app.
This model will store page-level access permissions for users.
"""

import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the project directory to the Python path
project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_dir not in sys.path:
    sys.path.append(project_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

try:
    import django
    django.setup()
    
    from django.db import models, transaction
    from django.apps import apps
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    
    logger.info("Django environment set up successfully")
except Exception as e:
    logger.error(f"Failed to set up Django environment: {e}")
    sys.exit(1)

# Script version and metadata
SCRIPT_VERSION = "0001"
SCRIPT_NAME = "add_page_privileges_model"
SCRIPT_DESCRIPTION = "Adds UserPagePrivilege model to the users app"


def create_model_file():
    """Add the UserPagePrivilege model to users/models.py"""
    try:
        # Path to the models.py file
        models_path = os.path.join(project_dir, 'users', 'models.py')
        
        # Ensure the file exists
        if not os.path.exists(models_path):
            logger.error(f"Models file not found at {models_path}")
            return False
        
        # Read the current content of models.py
        with open(models_path, 'r') as file:
            content = file.read()
        
        # Check if the model already exists
        if 'class UserPagePrivilege' in content:
            logger.info("UserPagePrivilege model already exists in models.py")
            return True
        
        # Model definition to add
        model_definition = """
class UserPagePrivilege(models.Model):
    """
    Model for storing user page access privileges.
    Links to a BusinessMember to define which pages a specific user can access.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_member = models.OneToOneField(BusinessMember, on_delete=models.CASCADE, related_name='page_privileges')
    page_access = models.JSONField(default=list, help_text="List of pages the user has access to")
    can_manage_users = models.BooleanField(default=False, help_text="Whether the user can manage other users")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_page_privileges')
    
    class Meta:
        db_table = 'users_page_privilege'
        indexes = [
            models.Index(fields=['business_member']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Page privileges for {self.business_member.user.email}"
"""
        
        # Append the model definition to models.py
        with open(models_path, 'a') as file:
            file.write(model_definition)
        
        logger.info("Added UserPagePrivilege model to models.py")
        return True
    
    except Exception as e:
        logger.error(f"Error adding UserPagePrivilege model: {e}")
        return False


def create_serializer():
    """Add UserPagePrivilegeSerializer to serializers.py"""
    try:
        # Path to the serializers.py file
        serializers_path = os.path.join(project_dir, 'users', 'serializers.py')
        
        # Ensure the file exists
        if not os.path.exists(serializers_path):
            logger.error(f"Serializers file not found at {serializers_path}")
            return False
        
        # Read the current content of serializers.py
        with open(serializers_path, 'r') as file:
            content = file.read()
        
        # Check if the serializer already exists
        if 'class UserPagePrivilegeSerializer' in content:
            logger.info("UserPagePrivilegeSerializer already exists in serializers.py")
            return True
        
        # Import statement to add
        import_statement = """from users.models import UserPagePrivilege\n"""
        
        # Serializer definition to add
        serializer_definition = """
class UserPagePrivilegeSerializer(serializers.ModelSerializer):
    business_member_id = serializers.UUIDField(source='business_member.id', read_only=True)
    user_id = serializers.UUIDField(source='business_member.user.id', read_only=True)
    user_email = serializers.EmailField(source='business_member.user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPagePrivilege
        fields = ['id', 'business_member_id', 'user_id', 'user_email', 'user_full_name', 
                  'page_access', 'can_manage_users', 'created_at', 'updated_at']
    
    def get_user_full_name(self, obj):
        """Get the full name of the user"""
        user = obj.business_member.user
        if user.first_name or user.last_name:
            return f"{user.first_name} {user.last_name}".strip()
        return user.email
"""
        
        # Check if import is already present
        if 'from users.models import UserPagePrivilege' not in content:
            # Find the last import statement
            import_lines = [i for i, line in enumerate(content.split('\n')) if line.startswith('from') or line.startswith('import')]
            if import_lines:
                last_import_line = import_lines[-1]
                lines = content.split('\n')
                lines.insert(last_import_line + 1, import_statement)
                content = '\n'.join(lines)
        
        # Append the serializer definition to serializers.py
        with open(serializers_path, 'w') as file:
            file.write(content)
            file.write(serializer_definition)
        
        logger.info("Added UserPagePrivilegeSerializer to serializers.py")
        return True
    
    except Exception as e:
        logger.error(f"Error adding UserPagePrivilegeSerializer: {e}")
        return False


def create_viewset():
    """Add UserPagePrivilegeViewSet to views.py"""
    try:
        # Path to the views.py file
        views_path = os.path.join(project_dir, 'users', 'views.py')
        
        # Ensure the file exists
        if not os.path.exists(views_path):
            logger.error(f"Views file not found at {views_path}")
            return False
        
        # Read the current content of views.py
        with open(views_path, 'r') as file:
            content = file.read()
        
        # Check if the viewset already exists
        if 'class UserPagePrivilegeViewSet' in content:
            logger.info("UserPagePrivilegeViewSet already exists in views.py")
            return True
        
        # Import statement to add
        import_statement = """from users.models import UserPagePrivilege
from users.serializers import UserPagePrivilegeSerializer\n"""
        
        # Viewset definition to add
        viewset_definition = """
class UserPagePrivilegeViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing user page access privileges
    """
    queryset = UserPagePrivilege.objects.all()
    serializer_class = UserPagePrivilegeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        This view should return a list of all page privileges for the current user's business
        or for a specific user if requested.
        """
        queryset = UserPagePrivilege.objects.all()
        
        # Get the user's business
        user = self.request.user
        try:
            user_profile = UserProfile.objects.get(user=user)
            business = user_profile.business
            
            if not business:
                return UserPagePrivilege.objects.none()
            
            # Check if user is requesting privileges for a specific user
            user_id = self.request.query_params.get('user_id', None)
            if user_id:
                try:
                    business_member = BusinessMember.objects.get(business=business, user__id=user_id)
                    return UserPagePrivilege.objects.filter(business_member=business_member)
                except BusinessMember.DoesNotExist:
                    return UserPagePrivilege.objects.none()
            
            # Otherwise, return all privileges for the business
            business_members = BusinessMember.objects.filter(business=business)
            return UserPagePrivilege.objects.filter(business_member__in=business_members)
            
        except UserProfile.DoesNotExist:
            return UserPagePrivilege.objects.none()
    
    @action(detail=False, methods=['get'])
    def current_user(self, request):
        """Get page privileges for the current user"""
        user = request.user
        try:
            # First check if the user has business_memberships
            business_member = BusinessMember.objects.filter(user=user).first()
            
            if not business_member:
                # User is not a member of any business, check if they have a business through profile
                user_profile = UserProfile.objects.filter(user=user).first()
                if user_profile and user_profile.business:
                    # Create a default business membership as OWNER
                    business_member, created = BusinessMember.objects.get_or_create(
                        user=user,
                        business=user_profile.business,
                        defaults={
                            'role': 'owner',
                            'is_active': True
                        }
                    )
                else:
                    # Return empty page access if no business
                    return Response({'page_access': []})
            
            # Now check for page privileges
            try:
                privileges = UserPagePrivilege.objects.get(business_member=business_member)
                serializer = self.get_serializer(privileges)
                return Response(serializer.data)
            except UserPagePrivilege.DoesNotExist:
                # For owners, create default privileges with all available pages
                if business_member.role.lower() == 'owner':
                    # Business owners have access to all pages
                    all_pages = [
                        'dashboard',
                        'finance',
                        'sales',
                        'purchases',
                        'inventory',
                        'hr',
                        'reports',
                        'products',
                        'crm',
                        'settings'
                    ]
                    
                    # Create default privileges
                    privileges = UserPagePrivilege.objects.create(
                        business_member=business_member,
                        page_access=all_pages,
                        can_manage_users=True,
                        created_by=user
                    )
                else:
                    # For employees, create with minimal access
                    privileges = UserPagePrivilege.objects.create(
                        business_member=business_member,
                        page_access=['dashboard'],
                        can_manage_users=False,
                        created_by=user
                    )
                
                serializer = self.get_serializer(privileges)
                return Response(serializer.data)
                
        except Exception as e:
            logger.error(f"Error fetching page privileges: {str(e)}")
            # Return a minimal set of pages so the UI isn't broken
            return Response({'page_access': ['dashboard']})
    
    @action(detail=False, methods=['post'])
    def set_privileges(self, request):
        """Set page privileges for a user"""
        user_id = request.data.get('user_id')
        page_access = request.data.get('page_access', [])
        can_manage_users = request.data.get('can_manage_users', False)
        
        if not user_id:
            return Response({'error': 'User ID is required'}, status=400)
        
        # Get the current user's business
        current_user = request.user
        try:
            current_user_profile = UserProfile.objects.get(user=current_user)
            business = current_user_profile.business
            
            if not business:
                return Response({'error': 'No business found for current user'}, status=404)
            
            # Check if current user is the owner or has user management permission
            current_user_member = BusinessMember.objects.filter(user=current_user, business=business).first()
            if not current_user_member or current_user_member.role != 'owner':
                # Check if they have user management permission
                try:
                    current_privileges = UserPagePrivilege.objects.get(business_member=current_user_member)
                    if not current_privileges.can_manage_users:
                        return Response({'error': 'You do not have permission to set page privileges'}, status=403)
                except UserPagePrivilege.DoesNotExist:
                    return Response({'error': 'You do not have permission to set page privileges'}, status=403)
            
            # Get the target user's business membership
            try:
                target_user = User.objects.get(id=user_id)
                business_member = BusinessMember.objects.get(user=target_user, business=business)
                
                # Owner role users should not have their privileges modified except by another owner
                if business_member.role.lower() == 'owner' and (not current_user_member or current_user_member.role.lower() != 'owner'):
                    return Response({'error': 'Only owners can modify privileges of other owners'}, status=403)
                
                # Update or create privileges
                privileges, created = UserPagePrivilege.objects.update_or_create(
                    business_member=business_member,
                    defaults={
                        'page_access': page_access,
                        'can_manage_users': can_manage_users,
                        'created_by': current_user
                    }
                )
                
                serializer = self.get_serializer(privileges)
                return Response(serializer.data)
                
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=404)
            except BusinessMember.DoesNotExist:
                return Response({'error': 'User is not a member of this business'}, status=404)
                
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found'}, status=404)
"""
        
        # Check if imports are already present
        if 'from users.models import UserPagePrivilege' not in content:
            # Find the last import statement
            import_lines = [i for i, line in enumerate(content.split('\n')) if line.startswith('from') or line.startswith('import')]
            if import_lines:
                last_import_line = import_lines[-1]
                lines = content.split('\n')
                lines.insert(last_import_line + 1, import_statement)
                content = '\n'.join(lines)
        
        # Append the viewset definition to views.py
        with open(views_path, 'w') as file:
            file.write(content)
            file.write(viewset_definition)
        
        logger.info("Added UserPagePrivilegeViewSet to views.py")
        return True
    
    except Exception as e:
        logger.error(f"Error adding UserPagePrivilegeViewSet: {e}")
        return False


def update_urls():
    """Update urls.py to include the new viewset"""
    try:
        # Path to the urls.py file
        urls_path = os.path.join(project_dir, 'users', 'urls.py')
        
        # Ensure the file exists
        if not os.path.exists(urls_path):
            logger.error(f"URLs file not found at {urls_path}")
            return False
        
        # Read the current content of urls.py
        with open(urls_path, 'r') as file:
            content = file.read()
        
        # Check if the URL pattern already exists
        if 'page-privileges' in content:
            logger.info("URL pattern for page-privileges already exists in urls.py")
            return True
        
        # Import statement to add
        import_statement = """from users.views import UserPagePrivilegeViewSet\n"""
        
        # URL pattern to add
        url_pattern = """router.register(r'page-privileges', UserPagePrivilegeViewSet, basename='page-privileges')\n"""
        
        # Check if import is already present
        if 'from users.views import UserPagePrivilegeViewSet' not in content:
            # Find the last import statement
            import_lines = [i for i, line in enumerate(content.split('\n')) if line.startswith('from') or line.startswith('import')]
            if import_lines:
                last_import_line = import_lines[-1]
                lines = content.split('\n')
                lines.insert(last_import_line + 1, import_statement)
                content = '\n'.join(lines)
        
        # Find router.register patterns
        register_lines = [i for i, line in enumerate(content.split('\n')) if 'router.register' in line]
        if register_lines:
            last_register_line = register_lines[-1]
            lines = content.split('\n')
            lines.insert(last_register_line + 1, url_pattern)
            content = '\n'.join(lines)
        
        # Write updated content back to urls.py
        with open(urls_path, 'w') as file:
            file.write(content)
        
        logger.info("Updated urls.py to include UserPagePrivilegeViewSet")
        return True
    
    except Exception as e:
        logger.error(f"Error updating urls.py: {e}")
        return False


def make_migration():
    """Generate migration for the new model"""
    try:
        # Import Django's management commands
        from django.core.management import call_command
        
        # Make migrations for the users app
        call_command('makemigrations', 'users')
        logger.info("Generated migration for UserPagePrivilege model")
        
        return True
    except Exception as e:
        logger.error(f"Error generating migration: {e}")
        return False


def main():
    """Main function to execute the script steps"""
    logger.info(f"Starting script {SCRIPT_NAME} v{SCRIPT_VERSION}")
    
    # Creating backup file for models.py
    models_path = os.path.join(project_dir, 'users', 'models.py')
    backup_path = f"{models_path}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
    try:
        with open(models_path, 'r') as src, open(backup_path, 'w') as dst:
            dst.write(src.read())
        logger.info(f"Created backup of models.py at {backup_path}")
    except Exception as e:
        logger.error(f"Failed to create backup of models.py: {e}")
        return False
    
    # Execute steps
    steps = [
        ("Adding UserPagePrivilege model", create_model_file),
        ("Adding UserPagePrivilegeSerializer", create_serializer),
        ("Adding UserPagePrivilegeViewSet", create_viewset),
        ("Updating URL patterns", update_urls),
        ("Generating migration", make_migration)
    ]
    
    success = True
    for step_name, step_func in steps:
        logger.info(f"Executing: {step_name}")
        if not step_func():
            logger.error(f"Failed at step: {step_name}")
            success = False
            break
    
    if success:
        logger.info(f"Script {SCRIPT_NAME} v{SCRIPT_VERSION} completed successfully")
    else:
        logger.error(f"Script {SCRIPT_NAME} v{SCRIPT_VERSION} failed")
    
    return success


if __name__ == "__main__":
    sys.exit(0 if main() else 1) 