# serializers.py
from allauth.account.adapter import get_adapter
from allauth.account.utils import setup_user_email
from dj_rest_auth.registration.serializers import RegisterSerializer
import django
from rest_framework import serializers

from pyfactor.userDatabaseRouter import UserDatabaseRouter
from .models import UserProfile, User
from business.models import Subscription, Business
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import IntegrityError, transaction
from django.contrib.auth import authenticate
from .utils import create_user_database, setup_user_database
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from finance.models import AccountType, Account, Transaction, Income
from pyfactor.logging_config import get_logger
import sys
import traceback

logger = get_logger()

class CustomRegisterSerializer(RegisterSerializer):
    username = None
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True, write_only=True)
    last_name = serializers.CharField(required=True, write_only=True)
    business_name = serializers.CharField(required=False, write_only=True)
    business_type = serializers.CharField(required=False, write_only=True)
    street = serializers.CharField(max_length=200, required=True)
    postcode = serializers.CharField(max_length=200, required=True)
    state = serializers.CharField(max_length=200, required=True)
    country = serializers.CharField(max_length=200, required=True)
    occupation = serializers.CharField(max_length=200, required=True)
    phone_number = serializers.CharField(max_length=200, required=False)
    subscription_type = serializers.ChoiceField(choices=Subscription.SUBSCRIPTION_TYPES)

    class Meta:
        model = User
        fields = ('email', 'password1', 'password2', 'first_name', 'last_name', 'business_name', 'business_type', 'occupation', 'street', 'postcode', 'state', 'country', 'subscription_type', 'database_name')
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': False}
        }

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user is already registered with this email address.")
        return email

    def validate(self, data):
        if data["password1"] != data["password2"]:
            raise serializers.ValidationError("The two password fields didn't match.")
        return data

    def save(self, **kwargs):
        logger.debug('CustomRegisterSerializer - save')
        validated_data = self.validated_data

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=validated_data['email'],
                    password=validated_data['password1'],
                    first_name=validated_data['first_name'],
                    last_name=validated_data['last_name']
                )

                # Generate the database name
                database_name = f"{user.email.replace('@', '').replace('.', '')}_{timezone.now().strftime('%Y%m%d%H%M%S')}"

                # Create the Business
                logger.info('Creating business...')
                business = Business.objects.create(
                    name=validated_data.get('business_name', ''),
                    business_type=validated_data.get('business_type', ''),
                    street=validated_data['street'],
                    postcode=validated_data['postcode'],
                    state=validated_data['state'],
                    country=validated_data['country'],
                    database_name=database_name
                )
                business.owners.add(user)
                business.save()  # Ensure the business is saved and committed before creating UserProfile

                # Call create_dynamic_database to create the database and add it to DATABASES and connections
                logger.debug('create_dynamic_database function called')
                router = UserDatabaseRouter()
                router.create_dynamic_database(database_name)
                logger.info('Database created: %s', database_name)

                logger.info('Creating user profile...')
                user_profile = UserProfile.objects.create(
                    user=user,
                    business=business,
                    occupation=validated_data['occupation'],
                    phone_number=validated_data.get('phone_number', ''),
                    is_business_owner=True,
                    database_name=database_name
                )
                logger.info('User profile created: %s', user_profile)

                # Call the setup_user_database function to create initial data in the user's database
                logger.debug('setup_user_database function called')
                setup_user_database(database_name, validated_data, user)

                # Create the subscription
                logger.info('Creating subscription...')
                Subscription.objects.create(
                    business=business,
                    subscription_type=validated_data['subscription_type'],
                    start_date=timezone.now(),
                )

                return user

        except Exception as e:
            logger.exception("Error during user creation: %s", str(e))
            raise serializers.ValidationError({'user': 'Failed to create user.'})

    def calculate_end_date(self, subscription_type):
        if subscription_type == 'free':
            return timezone.now() + timedelta(days=30)
        elif subscription_type.startswith('monthly'):
            return timezone.now() + relativedelta(months=1)
        elif subscription_type.startswith('yearly'):
            return timezone.now() + relativedelta(years=1)
        
        
    def calculate_end_date(self, subscription_type):
        if subscription_type == 'free':
            return timezone.now() + timedelta(days=30)
        elif subscription_type.startswith('monthly'):
            return timezone.now() + relativedelta(months=1)
        elif subscription_type.startswith('yearly'):
            return timezone.now() + relativedelta(years=1)


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
        return token

    
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
