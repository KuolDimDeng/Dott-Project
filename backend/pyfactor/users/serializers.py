# serializers.py
import uuid
from allauth.account.adapter import get_adapter
from allauth.account.utils import setup_user_email
from dj_rest_auth.registration.serializers import RegisterSerializer
import django
from rest_framework import serializers

from pyfactor.userDatabaseRouter import UserDatabaseRouter
from .models import UserProfile, User
from business.models import Subscription, Business
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import IntegrityError, connections, transaction
from django.contrib.auth import authenticate
from .utils import create_user_database, setup_user_database
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from finance.models import AccountType, Account, FinanceTransaction, Income
from pyfactor.logging_config import get_logger
import sys
import traceback

logger = get_logger()

class CustomRegisterSerializer(RegisterSerializer):
    username = None
    password1 = serializers.CharField(write_only=True, required=True)
    password2 = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
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
        fields = ('email', 'password1', 'password2', 'first_name', 'last_name', 'business_name', 'business_type', 'occupation', 'street', 'postcode', 'state', 'country', 'subscription_type', 'phone_number')

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user is already registered with this email address.")
        return email

    def validate(self, data):
        if data.get("password1") != data.get("password2"):
            raise serializers.ValidationError("The two password fields didn't match.")
        return data

    def save(self, request):
        user = User.objects.create_user(
            email=self.validated_data['email'],
            password=self.validated_data['password1'],
            first_name=self.validated_data.get('first_name', ''),
            last_name=self.validated_data.get('last_name', ''),
        )
        user.is_onboarded = False
        user.save()

        return user

class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    business_name = serializers.CharField(source='business.name', allow_null=True)

    class Meta:
        model = UserProfile
        fields = ['email', 'occupation', 'business_name', 'street', 'postcode', 'state', 'country', 'phone_number', 'database_name', 'first_name', 'last_name']

    def get_full_name(self, obj):
        logger.debug('UserProfileSerializer - get_full_name')
        user = obj.user
        if user:
            logger.debug('User: %s', user)
            return user.get_full_name()
        else:
            logger.warning('User is none...Failed')
            return ""  # or return a default value of your choice

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