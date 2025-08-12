# serializers.py
import uuid
from allauth.account.adapter import get_adapter
from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from .models import User, Tenant
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
        else:
            msg = 'Must include "email" and /* RLS: Use tenant_id filtering */ '
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs
    
    
class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.CharField(required=True)
    access_token = serializers.CharField(required=True)