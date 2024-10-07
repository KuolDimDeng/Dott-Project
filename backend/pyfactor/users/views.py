from django.db import connections, transaction, DatabaseError
from django.core.exceptions import ValidationError
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.authtoken.views import ObtainAuthToken
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from business.models import Business, Subscription
from business.serializers import BusinessRegistrationSerializer
from django.utils.timezone import timezone

import requests
import traceback

from .models import User, UserProfile
from .serializers import (
    CustomRegisterSerializer, 
    CustomTokenObtainPairSerializer, 
    CustomAuthTokenSerializer, 
    UserProfileSerializer, 
    SocialLoginSerializer
)
from .tokens import account_activation_token
from .utils import initial_user_registration, create_user_database, setup_user_database
from pyfactor.logging_config import get_logger
from business.models import Business

logger = get_logger()

# Register a new user with an email confirmation.
@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomRegisterSerializer
    
    def create(self, request, *args, **kwargs):
        logger.debug("Received request data: %s", request.data)
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            with transaction.atomic():
                user = initial_user_registration(serializer.validated_data)
                user.is_active = False
                user.save()

                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = account_activation_token.make_token(user)
                current_site = get_current_site(request)
                confirmation_url = reverse('activate', kwargs={'uidb64': uid, 'token': token})
                confirmation_link = f'http://{current_site.domain}{confirmation_url}'

                mail_subject = 'Activate your account'
                message = render_to_string('email_activation.html', {
                    'user': user,
                    'activate_url': confirmation_link
                })

                if not send_mail(mail_subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False):
                    raise ValidationError("Failed to send activation email")

            return Response({
                "message": "User registered successfully. Please check your email to confirm your account.",
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "message": "Registration failed. Please check the form and try again.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

# Obtain JWT tokens.
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# Authenticate user with email and password.
class CustomAuthToken(ObtainAuthToken):
    serializer_class = CustomAuthTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh = RefreshToken.for_user(user)
        return Response({
            'token': str(refresh.access_token),
            'user_id': user.id,
            'email': user.email,
            'is_onboarded': user.is_onboarded
        })

# Retrieve the user profile and business information.
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, *args, **kwargs):
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            business_data = None
            try:
                business = user_profile.business
                business_data = {
                    'id': str(business.id),
                    'name': business.name,
                    'business_type': business.business_type,
                    'street': business.street,
                    'city': business.city,
                    'state': business.state,
                    'postcode': business.postcode,
                    'country': str(business.country),
                    'email': business.email,
                    'phone_number': business.phone_number,
                }
            except Business.DoesNotExist:
                pass

            profile_data = UserProfileSerializer(user_profile).data
            profile_data['business'] = business_data
            profile_data['is_onboarded'] = request.user.is_onboarded
            return Response(profile_data)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Failed to retrieve user profile.'}, status=status.HTTP_404_NOT_FOUND)

# Retrieve onboarding status.
class OnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "is_onboarded": request.user.is_onboarded
        })



# Activate user account via email confirmation.
class ActivateAccountView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token, *args, **kwargs):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if account_activation_token.check_token(user, token):
                user.is_active = True
                user.save()
                return Response({
                    "message": "Account activated successfully. You can now log in."
                }, status=status.HTTP_200_OK)
            return Response({"message": "Activation link is invalid."}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"message": "Activation link is invalid."}, status=status.HTTP_400_BAD_REQUEST)

# Authenticate user with email and password.
class AuthTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(email=request.data.get('email'), password=request.data.get('password'))
        if user and user.is_active:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user_id': str(user.id),
                'email': user.email,
                'is_onboarded': user.is_onboarded,
                'token': str(refresh.access_token)
            })
        return Response({'error': 'Invalid credentials or user is inactive'}, status=status.HTTP_400_BAD_REQUEST)

class CompleteOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        logger.debug("Received request data: %s", request.data)
        user = request.user
        business_data = request.data.get('business')
        selected_plan = request.data.get('selectedPlan')
        billing_cycle = request.data.get('billingCycle')

        if not business_data or not selected_plan or not billing_cycle:
            return Response({"error": "Business data, selected plan, and billing cycle are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Validate and save business data
                business_serializer = BusinessRegistrationSerializer(data=business_data)
                if business_serializer.is_valid():
                    business = business_serializer.save(owner=user)
                else:
                    return Response({"error": "Invalid business data", "details": business_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

                # Create a subscription for the business
                Subscription.objects.create(
                    business=business,
                    subscription_type=selected_plan,
                    start_date=timezone.now().date(),
                    is_active=True
                )

                # Update user profile
                user_profile = UserProfile.objects.get(user=user)
                user_profile_serializer = UserProfileSerializer(user_profile, data=request.data.get('user_profile', {}), partial=True)
                if user_profile_serializer.is_valid():
                    user_profile = user_profile_serializer.save()
                else:
                    return Response({"error": "Invalid user profile data", "details": user_profile_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

                # Create a dynamic database for the business and set it up
                database_name = create_user_database(user, business_data)
                setup_user_database(database_name, request.data, user)

                # Mark the user as onboarded
                user.is_onboarded = True
                user.plan = selected_plan
                user.billing_cycle = billing_cycle
                user.save()

                return Response({"message": "Onboarding completed successfully"}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Unexpected error during onboarding: {str(e)}")
            return Response({"error": "An unexpected error occurred during onboarding"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SocialLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SocialLoginSerializer(data=request.data)
        if serializer.is_valid():
            provider = serializer.validated_data['provider']
            access_token = serializer.validated_data['access_token']

            if provider == 'google':
                user_info = self.validate_google_token(access_token)
                if user_info:
                    return self.get_or_create_user(user_info)
            return Response({'error': 'Unsupported provider'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': 'Invalid data'}, status=status.HTTP_400_BAD_REQUEST)

    def validate_google_token(self, access_token):
        try:
            response = requests.get('https://www.googleapis.com/oauth2/v3/userinfo', 
                                    headers={'Authorization': f'Bearer {access_token}'})
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            return None

    def get_or_create_user(self, user_info):
        email = user_info.get('email')
        if not email:
            return Response({'error': 'Email not provided'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(email=email)
        if created:
            user.first_name = user_info.get('given_name', '')
            user.last_name = user_info.get('family_name', '')
            user.is_active = True
            user.save()

            # Create UserProfile for the new user
            UserProfile.objects.create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user_id': str(user.id),
            'email': user.email,
            'is_onboarded': user.is_onboarded
        })