import uuid
from django.db import connections, transaction, DatabaseError
from rest_framework_simplejwt.views import TokenRefreshView
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

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.authtoken.views import ObtainAuthToken
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt

from django.contrib.auth.views import PasswordResetView, PasswordResetConfirmView
from django.urls import reverse_lazy
from django.contrib.auth.tokens import default_token_generator



import requests

from users.models import UserProfile

from .models import User
from .serializers import (
    CustomRegisterSerializer, 
    CustomAuthTokenSerializer, 
    SocialLoginSerializer
)
from .tokens import account_activation_token
from users.utils import initial_user_registration
from pyfactor.logging_config import get_logger



logger = get_logger()


# Create your views here.
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

# Activate user account via email confirmation.
class ActivateAccountView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"message": "Account activated successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Invalid activation link."}, status=status.HTTP_400_BAD_REQUEST)
        
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
    
    
class SignUpView(APIView):
    permission_classes = [AllowAny]  # Add this line to allow access without authentication

    def post(self, request):
        logger.info(f"Received sign-up request: {request.data}")
        serializer = CustomRegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            logger.info("Sign-up data is valid")
            try:
                # Save user
                user = serializer.save()
                logger.info(f"User created: {user.email}")
                
                # Send confirmation email
                try:
                    uid = urlsafe_base64_encode(force_bytes(user.pk))
                    token = default_token_generator.make_token(user)
                    activation_link = f"{settings.FRONTEND_URL}/activate/{uid}/{token}"
                    
                    subject = 'Activate your Pyfactor account'
                    message = render_to_string('activation/email_activation.html', {
                        'user': user,
                        'activate_url': activation_link,
                    })
                    
                    logger.info(f"Sending activation email to: {user.email}")
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
                    logger.info("Activation email sent successfully")
                    
                except Exception as e:
                    logger.error(f"Failed to send activation email: {str(e)}")
                    return Response({"error": "Failed to send activation email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                return Response({"message": "User registered successfully. Please check your email to activate your account."}, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Error during user creation: {str(e)}")
                return Response({"error": "Error creating user"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            logger.error(f"Invalid sign-up data: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class ForgotPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            # Generate a password reset token
            token = str(uuid.uuid4())
            # Save the token to the user (you might want to add a field for this)
            user.password_reset_token = token
            user.save()
            
            # Send password reset email
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
            send_mail(
                'Password Reset',
                f'Click this link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({"message": "Password reset email sent"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"message": "User with this email does not exist"}, status=status.HTTP_404_NOT_FOUND)
        
class CustomPasswordResetView(PasswordResetView):
    email_template_name = 'registration/password_reset_email.html'
    html_email_template_name = 'registration/password_reset_email.html'  # Use the same template for HTML emails
    success_url = reverse_lazy('password_reset_done')

class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    success_url = reverse_lazy('password_reset_complete')
    

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
    
@method_decorator(csrf_exempt, name='dispatch')  # Use only if CSRF is not needed
class UpdateSessionView(APIView):
    permission_classes = [IsAuthenticated]  # Ensures only logged-in users can access this view

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user = request.user
        try:
            # Update session data
            request.session['user_email'] = user.email
            request.session['user_role'] = user.role  # Assuming a role field in User model
            request.session['last_login'] = str(user.last_login)

            # Mark the session as modified to save the changes
            request.session.modified = True

            return Response({"status": "success", "message": "Session updated successfully."}, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)