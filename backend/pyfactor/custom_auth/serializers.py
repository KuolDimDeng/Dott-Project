# serializers.py
import uuid
# from allauth.account.adapter import get_adapter  # Commented out - using Auth0
# from dj_rest_auth.registration.serializers import RegisterSerializer  # Commented out - using Auth0
from rest_framework import serializers
from django.db import models, transaction
from django.utils import timezone
from .models import User, Tenant, PagePermission, UserPageAccess, UserInvitation, RoleTemplate
from .permission_models import (
    PermissionTemplate, Department, UserDepartment,
    TemporaryPermission, PermissionDelegation,
    PermissionAuditLog, PermissionRequest
)
from .permission_service import PermissionService
from users.models import Subscription

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = (
            'id',
            'schema_name',
            'name',
            'created_on',
            'is_active',
            'database_status',
            'setup_status',
            'last_setup_attempt',
            'setup_error_message',
            'last_health_check',
            'setup_task_id'
        )
        read_only_fields = ('id', 'created_on', 'setup_task_id')

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from pyfactor.logging_config import get_logger
from users.models import UserProfile  # Adjust the import path as necessary
from django.db import transaction as db_transaction
from users.choices import SUBSCRIPTION_TYPES  # Import from users.choices





logger = get_logger()


"""
# Commented out - using Auth0 instead of allauth
# Keeping this code for reference but it's not used

class CustomRegisterSerializer(RegisterSerializer):
    username = None  # Remove username if not used
    email = serializers.EmailField(required=True)
    password1 = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    business_name = serializers.CharField(required=False, allow_blank=True)
    business_type = serializers.CharField(required=False, allow_blank=True)
    occupation = serializers.CharField(required=False, allow_blank=True)
    street = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    postcode = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    subscription_type = serializers.ChoiceField(
            choices=SUBSCRIPTION_TYPES,  # Use the imported choices
            required=False, 
            allow_blank=True
        )
    class Meta:
        model = User
        fields = (
            'email', 'password1', 'password2', 'password', 'confirm_password', 'first_name', 'last_name', 
            'business_name', 'business_type', 'occupation', 'street', 
            'city', 'state', 'postcode', 'country', 'subscription_type', 'phone_number'
        )

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if User.objects.filter(email=email).exists():
            logger.warning(f"Attempted registration with existing email: {email}")
            raise serializers.ValidationError("This email address is already registered.")
        return email

    def validate(self, data):
        # Handle both password1/password2 and password/confirm_password field combinations
        password1 = data.get("password1") or data.get("password")
        password2 = data.get("password2") or data.get("confirm_password")
        
        if not password1:
            raise serializers.ValidationError("Password is required.")
            
        if not password2:
            raise serializers.ValidationError("Password confirmation is required.")
            
        if password1 != password2:
            raise serializers.ValidationError("The two password fields didn't match.")
            
        # Normalize the data to use password1/password2 internally
        if "password" in data:
            data["password1"] = data.pop("password")
            
        if "confirm_password" in data:
            data["password2"] = data.pop("confirm_password")
            
        return data

    def get_cleaned_data(self):
        return {
            'email': self.validated_data.get('email', ''),
            'password1': self.validated_data.get('password1', ''),
            'first_name': self.validated_data.get('first_name', ''),
            'last_name': self.validated_data.get('last_name', ''),
        }

    @db_transaction.atomic
    def save(self, request):
        user = super().save(request)
        try:
            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'occupation': self.validated_data.get('occupation', ''),
                    'street': self.validated_data.get('street', ''),
                    'city': self.validated_data.get('city', ''),
                    'state': self.validated_data.get('state', ''),
                    'postcode': self.validated_data.get('postcode', ''),
                    'country': self.validated_data.get('country', ''),
                    'phone_number': self.validated_data.get('phone_number', ''),
                }
            )
        except Exception as e:
            # If UserProfile creation fails, delete the user and raise the error
            user.delete()
            raise serializers.ValidationError(f"Error creating user profile: {str(e)}")

        user.is_onboarded = False
        user.save()

        return user

    def custom_signup(self, request, user):
        business_name = self.validated_data.get('business_name')
        if business_name:
            from users.models import Business
            business = Business.objects.create(business_name=business_name, owner=user)
        else:
            business = None

        UserProfile.objects.create(
            user=user,
            business=business,
            occupation=self.validated_data.get('occupation', ''),
            street=self.validated_data.get('street', ''),
            city=self.validated_data.get('city', ''),
            state=self.validated_data.get('state', ''),
            postcode=self.validated_data.get('postcode', ''),
            country=self.validated_data.get('country', ''),
            phone_number=self.validated_data.get('phone_number', ''),
            is_business_owner=bool(business_name)
        )

        user.is_onboarded = False
        user.save()

        logger.info("User profile created for email: %s", user.email)
"""
    
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['is_onboarded'] = user.is_onboarded
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Check if account has been deleted/closed
        if hasattr(self.user, 'is_deleted') and self.user.is_deleted:
            raise serializers.ValidationError('This account has been closed. Please contact support if you need assistance.')
        
        refresh = self.get_token(self.user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        data['user_id'] = self.user.id
        data['email'] = self.user.email
        data['is_onboarded'] = self.user.is_onboarded
        
        # Check subscription status on login
        from users.utils import check_subscription_status
        try:
            is_expired, previous_plan = check_subscription_status(self.user)
            if is_expired:
                logger.info(f"Subscription expired for user {self.user.email}, was on {previous_plan} plan")
                data['subscription_expired'] = True
                data['previous_plan'] = previous_plan
            else:
                data['subscription_expired'] = False
                data['current_plan'] = previous_plan  # Not expired, so this is the current plan
        except Exception as e:
            logger.error(f"Error checking subscription on login: {str(e)}")
            data['subscription_expired'] = False
            
        return data
    
class CustomAuthTokenSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        style={'input_type': 'password'},
        trim_whitespace=False,
        required=True,
    )

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)

            if not user:
                msg = 'Unable to log in with provided credentials.'
                raise serializers.ValidationError(msg, code='authorization')
            
            # Check if account has been deleted/closed
            if hasattr(user, 'is_deleted') and user.is_deleted:
                msg = 'This account has been closed. Please contact support if you need assistance.'
                raise serializers.ValidationError(msg, code='authorization')
        else:
            msg = 'Must include "email" and "password".'
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs
    
    
class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.CharField(required=True)
    access_token = serializers.CharField(required=True)


# RBAC Serializers

class PagePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagePermission
        fields = ['id', 'name', 'path', 'category', 'description', 'is_active']


class UserPageAccessSerializer(serializers.ModelSerializer):
    page = PagePermissionSerializer(read_only=True)
    page_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = UserPageAccess
        fields = ['id', 'page', 'page_id', 'can_read', 'can_write', 'can_edit', 'can_delete', 'granted_at']


class UserListSerializer(serializers.ModelSerializer):
    page_access = UserPageAccessSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'name',
            'role', 'is_active', 'date_joined', 'page_access',
            'onboarding_completed', 'subscription_plan'
        ]
        read_only_fields = ['id', 'date_joined', 'email']
    
    def get_full_name(self, obj):
        return f"{obj.first_name or ''} {obj.last_name or ''}".strip() or obj.email
    
    def get_name(self, obj):
        # Add 'name' field for frontend compatibility
        return self.get_full_name(obj)


class CreateUserInvitationSerializer(serializers.ModelSerializer):
    page_permissions = serializers.DictField(child=serializers.DictField(), required=False)
    
    class Meta:
        model = UserInvitation
        fields = ['email', 'role', 'page_permissions']
    
    def validate_email(self, value):
        # Check if user already exists in the tenant
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            if User.objects.filter(email=value, tenant=request.tenant).exists():
                raise serializers.ValidationError("A user with this email already exists in your organization.")
        return value
    
    def validate_role(self, value):
        # Prevent creating OWNER role
        if value == 'OWNER':
            raise serializers.ValidationError("Cannot assign Owner role. Each organization can only have one owner.")
        return value


class UserInvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = UserInvitation
        fields = [
            'id', 'email', 'role', 'status', 'created_at', 'sent_at',
            'accepted_at', 'expires_at', 'invited_by_name'
        ]
    
    def get_invited_by_name(self, obj):
        return f"{obj.invited_by.first_name or ''} {obj.invited_by.last_name or ''}".strip() or obj.invited_by.email


class UpdateUserPermissionsSerializer(serializers.Serializer):
    """Serializer for updating user permissions"""
    role = serializers.ChoiceField(choices=['ADMIN', 'USER'], required=False)
    page_permissions = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    
    def validate_page_permissions(self, value):
        """Validate page permissions structure"""
        for perm in value:
            if not all(key in perm for key in ['page_id', 'can_read', 'can_write', 'can_edit', 'can_delete']):
                raise serializers.ValidationError(
                    "Each permission must have page_id, can_read, can_write, can_edit, and can_delete"
                )
            
            # Validate and resolve page_id (could be UUID or string path)
            page_id = perm.get('page_id')
            if page_id:
                # Try UUID first
                try:
                    uuid.UUID(str(page_id))
                    # If it's a valid UUID, check if the page exists
                    if not PagePermission.objects.filter(id=page_id, is_active=True).exists():
                        raise serializers.ValidationError(
                            f"Page with id '{page_id}' does not exist or is not active"
                        )
                except (ValueError, TypeError):
                    # If not a UUID, try to find by path or name
                    # First try exact path match with common prefixes
                    page = None
                    
                    # Try different path patterns
                    path_patterns = [
                        f"/dashboard/{page_id}",
                        f"/dashboard/{page_id.replace('-', '/')}",  # Convert sales-products to sales/products
                        f"/dashboard/products/{page_id}",
                        f"/dashboard/services/{page_id}",
                        f"/dashboard/customers/{page_id}",
                        f"/dashboard/vendors/{page_id}",
                    ]
                    
                    for pattern in path_patterns:
                        page = PagePermission.objects.filter(path=pattern, is_active=True).first()
                        if page:
                            break
                    
                    # If still not found, try more flexible matching
                    if not page:
                        page = PagePermission.objects.filter(
                            models.Q(path__icontains=str(page_id)) | 
                            models.Q(name__iexact=str(page_id)) |
                            models.Q(path__endswith=f"/{page_id}"),
                            is_active=True
                        ).first()
                    
                    if page:
                        # Replace string with actual UUID
                        perm['page_id'] = str(page.id)
                    else:
                        raise serializers.ValidationError(
                            f"Page with identifier '{page_id}' not found. Must be a valid UUID or page path."
                        )
        return value


class RoleTemplateSerializer(serializers.ModelSerializer):
    pages_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RoleTemplate
        fields = ['id', 'name', 'description', 'pages_count', 'is_active', 'created_at']
    
    def get_pages_count(self, obj):
        return obj.pages.count()


class PermissionTemplateSerializer(serializers.ModelSerializer):
    """Serializer for permission templates"""
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    usage_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionTemplate
        fields = [
            'id', 'name', 'code', 'description', 'permissions',
            'template_type', 'is_active', 'created_at', 'updated_at',
            'created_by', 'created_by_name', 'usage_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_usage_count(self, obj):
        """Get count of users using this template"""
        # This would be implemented based on your tracking mechanism
        return 0
    
    def validate_code(self, value):
        """Ensure code is unique within tenant"""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            exists = PermissionTemplate.objects.filter(
                code=value,
                tenant=request.tenant
            ).exclude(pk=self.instance.pk if self.instance else None).exists()
            if exists:
                raise serializers.ValidationError("Template code must be unique.")
        return value


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for departments"""
    manager_name = serializers.CharField(source='manager.name', read_only=True)
    member_count = serializers.SerializerMethodField()
    default_template_name = serializers.CharField(source='default_template.name', read_only=True)
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'default_template',
            'default_template_name', 'default_permissions', 'parent_department',
            'manager', 'manager_name', 'member_count', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()


class UserDepartmentSerializer(serializers.ModelSerializer):
    """Serializer for user department assignments"""
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = UserDepartment
        fields = [
            'id', 'user', 'user_name', 'user_email', 'department',
            'department_name', 'role', 'joined_date', 'left_date',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TemporaryPermissionSerializer(serializers.ModelSerializer):
    """Serializer for temporary permissions"""
    user_name = serializers.CharField(source='user.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = TemporaryPermission
        fields = [
            'id', 'user', 'user_name', 'permissions', 'reason',
            'valid_from', 'valid_until', 'approved_by', 'approved_by_name',
            'approved_at', 'is_active', 'revoked', 'revoked_by',
            'revoked_at', 'revoke_reason', 'created_at', 'created_by',
            'is_valid'
        ]
        read_only_fields = [
            'id', 'created_at', 'approved_at', 'revoked_at'
        ]
    
    def get_is_valid(self, obj):
        return obj.is_valid()
    
    def validate(self, data):
        """Ensure valid_until is after valid_from"""
        valid_from = data.get('valid_from', timezone.now())
        valid_until = data.get('valid_until')
        
        if valid_until and valid_until <= valid_from:
            raise serializers.ValidationError(
                "Valid until must be after valid from."
            )
        return data


class PermissionDelegationSerializer(serializers.ModelSerializer):
    """Serializer for permission delegation"""
    delegator_name = serializers.CharField(source='delegator.name', read_only=True)
    delegate_name = serializers.CharField(source='delegate.name', read_only=True)
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionDelegation
        fields = [
            'id', 'delegator', 'delegator_name', 'delegate', 'delegate_name',
            'permissions_to_delegate', 'reason', 'start_date', 'end_date',
            'is_active', 'accepted', 'accepted_at', 'revoked', 'revoked_at',
            'revoke_reason', 'created_at', 'is_valid'
        ]
        read_only_fields = ['id', 'created_at', 'accepted_at', 'revoked_at']
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class PermissionAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for permission audit logs"""
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.name', read_only=True)
    
    class Meta:
        model = PermissionAuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action',
            'old_permissions', 'new_permissions', 'changes_summary',
            'changed_by', 'changed_by_name', 'change_reason',
            'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PermissionRequestSerializer(serializers.ModelSerializer):
    """Serializer for permission requests"""
    requester_name = serializers.CharField(source='requester.name', read_only=True)
    requester_email = serializers.CharField(source='requester.email', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True)
    
    class Meta:
        model = PermissionRequest
        fields = [
            'id', 'requester', 'requester_name', 'requester_email',
            'requested_permissions', 'justification', 'is_permanent',
            'requested_duration_days', 'status', 'reviewed_by',
            'reviewed_by_name', 'reviewed_at', 'review_notes',
            'approved_permissions', 'valid_until', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'reviewed_at',
            'approved_permissions', 'valid_until'
        ]


class ApplyTemplateSerializer(serializers.Serializer):
    """Serializer for applying permission template to users"""
    template_id = serializers.UUIDField(required=False)
    template_code = serializers.CharField(required=False)
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    merge_permissions = serializers.BooleanField(
        default=False,
        help_text="If true, merge with existing permissions. If false, replace."
    )
    
    def validate(self, data):
        if not data.get('template_id') and not data.get('template_code'):
            raise serializers.ValidationError(
                "Either template_id or template_code is required."
            )
        return data


class BulkPermissionUpdateSerializer(serializers.Serializer):
    """Serializer for bulk permission updates"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    permissions = serializers.JSONField(required=True)
    action = serializers.ChoiceField(
        choices=['add', 'remove', 'replace'],
        default='replace'
    )
    reason = serializers.CharField(required=False, allow_blank=True)