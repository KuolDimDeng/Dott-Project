# serializers.py
import uuid
from allauth.account.adapter import get_adapter
from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from .models import User, Tenant, PagePermission, UserPageAccess, UserInvitation, RoleTemplate
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
from django.db import transaction
from users.choices import SUBSCRIPTION_TYPES  # Import from users.choices





logger = get_logger()


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

    @transaction.atomic
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
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_active', 'date_joined', 'page_access',
            'onboarding_completed', 'subscription_plan'
        ]
        read_only_fields = ['id', 'date_joined', 'email']
    
    def get_full_name(self, obj):
        return f"{obj.first_name or ''} {obj.last_name or ''}".strip() or obj.email


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
    user_id = serializers.UUIDField()
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
        return value


class RoleTemplateSerializer(serializers.ModelSerializer):
    pages_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RoleTemplate
        fields = ['id', 'name', 'description', 'pages_count', 'is_active', 'created_at']
    
    def get_pages_count(self, obj):
        return obj.pages.count()