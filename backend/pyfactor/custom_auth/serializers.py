# serializers.py
import uuid
from allauth.account.adapter import get_adapter
from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from .models import User
from business.models import Subscription
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from pyfactor.logging_config import get_logger


logger = get_logger()


class CustomRegisterSerializer(RegisterSerializer):
    username = None  # Remove username if not used
    email = serializers.EmailField(required=True)
    password1 = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    business_name = serializers.CharField(required=False, allow_blank=True)
    business_type = serializers.CharField(required=False, allow_blank=True)
    street = serializers.CharField(required=False, allow_blank=True)
    postcode = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    occupation = serializers.ChoiceField(choices=User.OCCUPATION_CHOICES, required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    subscription_type = serializers.ChoiceField(choices=Subscription.SUBSCRIPTION_TYPES, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'email', 'password1', 'password2', 'first_name', 'last_name', 
            'business_name', 'business_type', 'occupation', 'street', 
            'postcode', 'state', 'country', 'subscription_type', 'phone_number'
        )

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if User.objects.filter(email=email).exists():
            logger.error("Email already registered: %s", email)
            raise serializers.ValidationError("A user is already registered with this email address.")
        return email

    def validate(self, data):
        # Ensure passwords match
        if data.get("password1") != data.get("password2"):
            logger.warning("Password mismatch")
            raise serializers.ValidationError("The two password fields didn't match.")
        
        # Ensure required fields are provided
        if not data.get("email"):
            raise serializers.ValidationError("Email is required.")
        if not data.get("password1"):
            raise serializers.ValidationError("Password is required.")
        if not data.get("password2"):
            raise serializers.ValidationError("Password confirmation is required.")
        
        return data

    def save(self, request):
        logger.debug("Starting user registration for email: %s", self.validated_data['email'])
        
        # Creating the user with basic fields
        user = User.objects.create_user(
            email=self.validated_data['email'],
            password=self.validated_data['password1'],
            first_name=self.validated_data.get('first_name', ''),
            last_name=self.validated_data.get('last_name', ''),
        )
        
        # Optional fields can be saved to a user profile or related model
        profile_data = {
            'business_name': self.validated_data.get('business_name', ''),
            'business_type': self.validated_data.get('business_type', ''),
            'occupation': self.validated_data.get('occupation', ''),
            'street': self.validated_data.get('street', ''),
            'postcode': self.validated_data.get('postcode', ''),
            'state': self.validated_data.get('state', ''),
            'country': self.validated_data.get('country', ''),
            'phone_number': self.validated_data.get('phone_number', ''),
        }
        
        # Assuming you have a UserProfile model to store additional fields
        UserProfile.objects.create(user=user, **profile_data)
        
        user.is_onboarded = False
        user.save()

        logger.info("User registration successful for email: %s", user.email)
        return user

    
    
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
            msg = 'Must include "email" and "password".'
            raise serializers.ValidationError(msg, code='authorization')

        attrs['user'] = user
        return attrs
    
    
class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.CharField(required=True)
    access_token = serializers.CharField(required=True)