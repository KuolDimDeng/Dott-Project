from django.db import connections, transaction, DatabaseError
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse
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
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
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

logger = get_logger()

# Register a new user with an email confirmation.
@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomRegisterSerializer
    
    def create(self, request, *args, **kwargs):
        logger.debug("RegisterView: Received request data: %s", request.data)
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = initial_user_registration(serializer.validated_data)
                    user.is_active = False
                    user.save()

                    # Send confirmation email
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

                    send_mail(mail_subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])

                logger.info("User registered successfully. Awaiting email confirmation.")
                return Response({
                    "message": "User registered successfully. Please check your email to confirm your account.",
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.exception("Failed to register user: %s", str(e))
                return Response({"error": "Failed to register user"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.warning("Registration failed: %s", serializer.errors)
            return Response({
                "message": "Registration failed. Please check the form and try again.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

# Obtain JWT tokens.
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.get('refresh')
            if refresh_token:
                response.set_cookie(
                    'refresh_token',
                    refresh_token,
                    max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                    httponly=True,
                    secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', True),
                    samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                    domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN'),
                    path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/')
                )
        return response
    
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
        logger.debug("ProfileView: Received request data: %s", request.data)
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            business_data = None
            logger.info("Retrieving user profile for user %s", request.user)
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
                logger.info("No business found for user %s", request.user)

            profile_data = UserProfileSerializer(user_profile).data
            profile_data['business'] = business_data
            profile_data['is_onboarded'] = request.user.is_onboarded
            logger.info("Retrieved user profile for user %s", request.user)
            return JsonResponse(profile_data)

        except UserProfile.DoesNotExist:
            logger.error("UserProfile not found for user: %s", request.user)
            return JsonResponse({'error': 'Failed to retrieve user profile.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Unexpected error in ProfileView: %s", str(e))
            return JsonResponse({"error": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

class SocialLoginView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        logger.debug(f"Received social login request: {request.data}")
        serializer = SocialLoginSerializer(data=request.data)
        if serializer.is_valid():
            logger.debug(f"Validating social login data: {serializer.validated_data}")
            provider = serializer.validated_data['provider']
            access_token = serializer.validated_data['access_token']
            id_token = serializer.validated_data.get('id_token')
            logger.debug(f"Retrieving user info for provider: {provider}")

            logger.debug(f"Validating token for provider: {provider}")
            if provider == 'google':
                user_info = self.validate_google_token(access_token, id_token)
                if user_info:
                    logger.debug(f"User info retrieved: {user_info}")
                    user = self.get_or_create_user(user_info)
                    logger.debug(f"User created or retrieved: {user}")
                    if user:
                        refresh = RefreshToken.for_user(user)
                        response_data = {
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                            'user_id': str(user.id),
                            'email': user.email,
                            'is_onboarded': user.is_onboarded
                        }
                        logger.info(f"Social login successful for user: {user.email}")
                        return Response(response_data)
                    else:
                        logger.error("Failed to create or get user")
                        return Response({'error': 'Failed to create or get user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                else:
                    logger.error("Failed to validate Google token")
                    return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.warning(f"Unsupported provider: {provider}")
            return Response({'error': 'Unsupported provider'}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.error(f"Invalid social login data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def validate_google_token(self, access_token, id_token):
        logger.debug("Validating Google token")
        try:
            response = requests.get('https://www.googleapis.com/oauth2/v3/userinfo', 
                                    headers={'Authorization': f'Bearer {access_token}'})
            response.raise_for_status()
            logger.debug(f"Google user info retrieved: {response.json()}")
            return response.json()
        except requests.RequestException as e:
            logger.error("Failed to validate Google token: %s", str(e))
            return None

    @transaction.atomic
    def get_or_create_user(self, user_info):
        email = user_info.get('email')
        logger.debug(f"Checking if user exists with email: {email}")
        if not email:
            logger.error("Email not provided in user_info")
            return None
        logger.debug(f"User not found, creating new user with email: {email}")
        user, created = User.objects.get_or_create(email=email)
        if created:
            user.first_name = user_info.get('given_name', '')
            user.last_name = user_info.get('family_name', '')
            user.is_active = True
            user.save()

            # Create UserProfile for the new user
            UserProfile.objects.create(user=user)
            logger.info(f"New user created: {email}")

        return user
        
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        logger.debug("Handling custom token refresh request")
        logger.debug(f"Received request data: {request.data}")

        # Get the refresh token from the request or cookies
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
        if not refresh_token:
            logger.warning("No refresh token provided.")
            return Response({"detail": "No refresh token provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Instead of modifying request.data, create a new dictionary for the super call
        refresh_request_data = {'refresh': refresh_token}
        
        response = super().post(request, *args, **kwargs)
        
        logger.debug("Custom token refresh response: %s", response.data)
        if response.status_code == 200 and 'refresh' in response.data:
            response.set_cookie(
                'refresh_token',
                response.data['refresh'],
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', True),
                samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
                domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN'),
                path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/')
            )
        return response