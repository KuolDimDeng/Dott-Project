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
from business.serializer_helpers import BusinessProfileSerializer
from pyfactor.logging_config import get_logger
import sys
import traceback

logger = get_logger()



class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    business_name = serializers.SerializerMethodField()
    business_type = serializers.SerializerMethodField()
    business_data = BusinessProfileSerializer(source='business', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'email',
            'first_name',
            'last_name', 
            'occupation',
            'street',
            'city',
            'state',
            'postcode',
            'country',
            'phone_number',
            'database_name',
            'database_status',
            'business_name',
            'business_type',
            'business_data'
        ]

    def get_full_name(self, obj):
        logger.debug('UserProfileSerializer - get_full_name')
        user = obj.user
        if user:
            logger.debug('User: %s', user)
            return user.get_full_name()
        else:
            logger.warning('User is none...Failed')
            return ""  # or return a default value of your choice

    def get_business_name(self, obj):
        try:
            return obj.business.business_name if obj.business else None
        except AttributeError:
            logger.warning(f"Failed to get business_name for profile {obj.id}")
            return None

    def get_business_type(self, obj):
        try:
            return obj.business.business_type if obj.business else None
        except AttributeError:
            logger.warning(f"Failed to get business_type for profile {obj.id}")
            return None