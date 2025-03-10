import uuid
from django.db import connections, transaction, DatabaseError, IntegrityError
from rest_framework_simplejwt.views import TokenRefreshView
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from .utils import create_tenant_schema_for_user
from django.template.loader import render_to_string
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from users.models import UserProfile
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.authtoken.views import ObtainAuthToken
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage
from django.contrib.auth.views import PasswordResetView, PasswordResetConfirmView
from django.urls import reverse_lazy
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.utils.decorators import method_decorator
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from django.utils import timezone
from django.core.signing import TimestampSigner

from asgiref.sync import sync_to_async
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
from django.urls import path, re_path

logger = get_logger()

ONBOARDING_STATUS_CHOICES = [
    ('business-info', 'Business Information'),
    ('subscription', 'Subscription Selection'),
    ('payment', 'Payment'),
    ('setup', 'Database Setup'),
    ('complete', 'Complete'),
]

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

class SessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({
                'isLoggedIn': False,
                'user': None
            }, status=status.HTTP_200_OK)

        return Response({
            'isLoggedIn': True,
            'user': {
                'id': str(request.user.id),
                'email': request.user.email,
                'onboarding_status': getattr(request.user, 'onboarding_status', 'business-info'),
                'currentStep': getattr(request.user, 'current_step', 'business-info'),
                'nextStep': getattr(request.user, 'next_step', 'subscription'),
                'selected_plan': getattr(request.user, 'selected_plan', None),
                'databaseStatus': getattr(request.user, 'database_status', None),
                'setupStatus': getattr(request.user, 'setup_status', None),
                'lastUpdated': timezone.now().isoformat()
            }
        })

    def validate_status(self, status_value):
        return status_value in dict(ONBOARDING_STATUS_CHOICES)

    def post(self, request):
        request_id = str(uuid.uuid4())
        try:
            if not request.user.is_authenticated:
                return Response({
                    'isLoggedIn': False,
                    'user': None
                }, status=status.HTTP_200_OK)

            access_token = request.data.get('accessToken')
            refresh_token = request.data.get('refreshToken')
            update = request.data.get('update', {})

            if update and not access_token:
                return Response({
                    'success': False,
                    'message': 'No access token provided',
                    'requestId': request_id
                }, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            
            new_onboarding_status = update.get('onboarding_status')
            if new_onboarding_status and self.validate_status(new_onboarding_status):
                user.onboarding_status = new_onboarding_status

            new_current_step = update.get('currentStep')
            if new_current_step and self.validate_status(new_current_step):
                user.current_step = new_current_step

            new_next_step = update.get('nextStep')
            if new_next_step and self.validate_status(new_next_step):
                user.next_step = new_next_step

            if hasattr(user, 'selected_plan'):
                user.selected_plan = update.get('selected_plan', user.selected_plan)
            if hasattr(user, 'database_status'):
                user.database_status = update.get('databaseStatus', user.database_status)
            if hasattr(user, 'setup_status'):
                user.setup_status = update.get('setupStatus', user.setup_status)

            user.last_login = timezone.now()
            user.save()

            return Response({
                'success': True,
                'session': {
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'onboarding_status': user.onboarding_status,
                        'currentStep': user.current_step,
                        'nextStep': user.next_step,
                        'selected_plan': getattr(user, 'selected_plan', None),
                        'databaseStatus': getattr(user, 'database_status', None),
                        'setupStatus': getattr(user, 'setup_status', None),
                        'lastUpdated': timezone.now().isoformat(),
                        'accessToken': access_token,
                        'refreshToken': refresh_token
                    }
                },
                'requestId': request_id
            })

        except Exception as e:
            logger.error('Session update failed', extra={
                'request_id': request_id,
                'user_id': getattr(request.user, 'id', None),
                'error': str(e)
            })
            return Response({
                'success': False,
                'message': 'Session update failed',
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

class CustomAuthToken(ObtainAuthToken):
    serializer_class = CustomAuthTokenSerializer

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.serializer_class(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']

            # Create tenant schema if user doesn't have one
            if not hasattr(user, 'tenant') or user.tenant is None:
                logger.info(f"Creating tenant schema for user {user.email} during authentication")
                try:
                    # Create tenant schema
                    tenant = create_tenant_schema_for_user(user)
                    logger.info(f"Tenant schema created successfully: {tenant.schema_name}")
                except Exception as e:
                    logger.error(f"Failed to create tenant schema: {str(e)}")
                    # Continue with authentication even if tenant creation fails
                    # We'll retry on subsequent requests

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            # Add tenant information to response if available
            response_data = {
                'access': access_token,
                'refresh': str(refresh),
                'user_id': str(user.id),
                'email': user.email,
                'is_onboarded': user.is_onboarded
            }
            
            if hasattr(user, 'tenant') and user.tenant:
                response_data['tenant_id'] = str(user.tenant.id)
                response_data['schema_name'] = user.tenant.schema_name

            response = Response(response_data)
            
            # Set tokens in cookies
            TokenService.set_token_cookie(response, 'access', access_token)
            TokenService.set_token_cookie(response, 'refresh', str(refresh))

            return response

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return Response(
                {"error": "Authentication failed"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

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
                        # Create tenant schema if user doesn't have one
                        if not hasattr(user, 'tenant') or user.tenant is None:
                            logger.info(f"Creating tenant schema for user {user.email} during social login")
                            try:
                                # Create tenant schema
                                tenant = create_tenant_schema_for_user(user)
                                logger.info(f"Tenant schema created successfully: {tenant.schema_name}")
                            except Exception as e:
                                logger.error(f"Failed to create tenant schema: {str(e)}")
                                # Continue with authentication even if tenant creation fails
                                # We'll retry on subsequent requests

                        refresh = RefreshToken.for_user(user)
                        response_data = {
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                            'user_id': str(user.id),
                            'email': user.email,
                            'is_onboarded': user.is_onboarded
                        }
                        
                        # Add tenant information to response if available
                        if hasattr(user, 'tenant') and user.tenant:
                            response_data['tenant_id'] = str(user.tenant.id)
                            response_data['schema_name'] = user.tenant.schema_name
                            
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
    permission_classes = [AllowAny]

    def send_activation_email(self, user):
        cache_key = f"activation_email_{user.email}"
        if cache.get(cache_key):
            logger.warning(f"Activation email request too frequent for {user.email}")
            return False
            
        # Set a cooldown period of 5 minutes
        cache.set(cache_key, True, 300)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        activation_link = f"{settings.FRONTEND_URL}/activate/{uid}/{token}"
            
        subject = 'Activate your Dott account'
        message = f'Please click on this link to activate your account: {activation_link}'
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [user.email]
        
        try:
            email = EmailMessage(subject, message, from_email, recipient_list)
            email.send(fail_silently=False)
            logger.info(f"Activation email sent successfully to: {user.email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send activation email: {str(e)}")
            return False

    def make_activation_token(self, user):
        signer = TimestampSigner()
        return signer.sign_object({
            'user_id': str(user.pk),
            'email': user.email
        })

    def create_response(self, success, message, data=None, status_code=200):
        response = {
            'success': success,
            'message': message
        }
        if data:
            response['data'] = data
        return Response(response, status=status_code)

    def post(self, request):
        logger.info(f"Received sign-up request: {request.data}")
        
        serializer = CustomRegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            logger.info("Sign-up data is valid")
            try:
                with transaction.atomic():
                    try:
                        # Create user first
                        user = User.objects.create(
                            email=serializer.validated_data['email'],
                            is_active=False
                        )
                        user.set_password(serializer.validated_data['password1'])
                        user.save()

                        # Create profile with explicit ID
                        profile = UserProfile.objects.create(
                            user=user,
                            user_id=user.id  # Explicitly set user_id to match user.id
                        )
                        logger.info(f"User and profile created: {user.email}")
                        
                    except IntegrityError as e:
                        logger.error(f"Database integrity error: {str(e)}")
                        if 'unique constraint' in str(e).lower():
                            return Response({
                                'error': 'An account with this email already exists'
                            }, status=status.HTTP_400_BAD_REQUEST)
                        return Response({
                            'error': 'An error occurred during registration'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                    # Send confirmation email
                    email_sent = self.send_activation_email(user)

                if email_sent:
                    return Response({
                        "message": "User registered successfully. Please check your email to activate your account.",
                        "user_id": str(user.id),
                        "email": user.email
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({
                        "message": "User registered successfully, but we couldn't send the activation email. Please contact support.",
                        "user_id": str(user.id),
                        "email": user.email
                    }, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Error during user creation: {str(e)}")
                return Response({
                    "error": "An error occurred during registration. Please try again later."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            # Handle validation errors
            logger.warning(f"Invalid sign-up data: {serializer.errors}")
            
            # Check for existing email
            if 'email' in serializer.errors:
                try:
                    user = User.objects.get(email=request.data.get('email'))
                    if not user.is_active:
                        self.send_activation_email(user)
                        return Response({
                            "message": "This email is already registered but not activated. We've sent a new activation email."
                        }, status=status.HTTP_200_OK)
                    return Response({
                        "message": "This email is already registered. Please try logging in.",
                        "login_url": f"{settings.FRONTEND_URL}/auth/signin"
                    }, status=status.HTTP_400_BAD_REQUEST)
                except User.DoesNotExist:
                    pass

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
            
            # Create tenant schema if user doesn't have one
            tenant = None
            if not hasattr(user, 'tenant') or user.tenant is None:
                logger.info(f"Creating tenant schema for user {user.email} during account activation")
                try:
                    # Create tenant schema
                    tenant = create_tenant_schema_for_user(user)
                    logger.info(f"Tenant schema created successfully: {tenant.schema_name}")
                except Exception as e:
                    logger.error(f"Failed to create tenant schema during activation: {str(e)}")
                    # Continue with activation even if tenant creation fails
            
            response_data = {"message": "Account activated successfully."}
            
            # Add tenant information to response if available
            if tenant:
                response_data["tenant_id"] = str(tenant.id)
                response_data["schema_name"] = tenant.schema_name
                
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Invalid activation link."}, status=status.HTTP_400_BAD_REQUEST)

class ResendActivationEmailView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            if user.is_active:
                return Response({
                    'message': 'Account is already activated'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            # Generate new activation token
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            activation_link = f"{settings.FRONTEND_URL}/activate/{uid}/{token}"
            
            # Send activation email
            send_activation_email(user.email, activation_link)
            
            return Response({
                'message': 'Activation email has been resent'
            })
            
        except User.DoesNotExist:
            return Response({
                'message': 'No account found with this email'
            }, status=status.HTTP_404_NOT_FOUND)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, key):
        try:
            signer = TimestampSigner()
            data = signer.unsign_object(key, max_age=86400)  # 24 hour expiry
            
            user = User.objects.get(pk=data['user_id'])
            user.email_verified = True
            user.save()

            return Response({
                'message': 'Email verified successfully'
            })
        except Exception as e:
            return Response({
                'message': 'Invalid or expired verification link'
            }, status=status.HTTP_400_BAD_REQUEST)

class health_check(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "healthy"}, status=status.HTTP_200_OK)

class AuthErrorView(APIView):
    permission_classes = [AllowAny]
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def post(self, request, *args, **kwargs):
        try:
            # Handle both JSON and form data
            error_data = request.data if isinstance(request.data, dict) else {}
            
            logger.error("Client-side error logged", extra={
                'error_data': error_data,
                'path': request.path,
                'method': request.method,
                'user_agent': request.META.get('HTTP_USER_AGENT'),
                'referer': request.META.get('HTTP_REFERER')
            })
            
            return Response({
                "status": "logged",
                "message": "Error logged successfully",
                "received_data": error_data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error handling request: {str(e)}")
            return Response({
                "status": "error",
                "message": "Failed to process error log"
            }, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, *args, **kwargs):
        # Handle GET requests
        return Response({
            "message": "Error logging endpoint is available",
            "supported_methods": ["POST"]
        }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_user(request):
    """
    Setup a new user's account by creating necessary database records
    """
    try:
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'User ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Create user profile if it doesn't exist
            user_profile, created = UserProfile.objects.get_or_create(
                user_id=user_id,
                defaults={
                    'setup_complete': False,
                    'onboarding_status': 'SETUP'
                }
            )

            # Create business record if it doesn't exist
            business = Business.objects.create(
                user_profile=user_profile,
                name=request.data.get('business_name', 'My Business'),
                business_type=request.data.get('business_type', 'Other'),
                country=request.data.get('country', 'US')
            )

            # Create default accounts
            Account.objects.create(
                business=business,
                name='Cash',
                account_type='CASH',
                currency='USD'
            )
            Account.objects.create(
                business=business,
                name='Bank',
                account_type='BANK',
                currency='USD'
            )

            # Mark setup as complete
            user_profile.setup_complete = True
            user_profile.save()

            logger.info(f'User setup completed successfully for user {user_id}')
            
            return Response({
                'message': 'Setup completed successfully',
                'user_profile': UserProfileSerializer(user_profile).data
            })

    except Exception as e:
        logger.error(f'Setup failed for user {user_id}: {str(e)}')
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def async_csrf_exempt(view_func):
    """
    Decorator that wraps the given view with CSRF exemption for async views.
    """
    return method_decorator(csrf_exempt)(view_func)

class TokenService:
    @staticmethod
    def set_token_cookie(response, token_type, token_value):
        """Set token cookie with appropriate settings"""
        cookie_name = f'{token_type}_token'
        max_age = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds() if token_type == 'refresh' else \
                 settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()
        
        response.set_cookie(
            cookie_name,
            token_value,
            max_age=max_age,
            httponly=True,
            secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', True),
            samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax'),
            domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN'),
            path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/')
        )

class SignupAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Handle user signup after Cognito confirmation
        """
        logger.debug("Received signup request: %s", request.data)
        try:
            # Validate required fields
            email = request.data.get('email')
            cognito_id = request.data.get('cognitoId')
            user_role = request.data.get('userRole', 'OWNER')

            if not email or not cognito_id:
                logger.error("Missing required fields in signup request")
                return Response(
                    {"error": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # Create or update user
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'cognito_sub': cognito_id,
                        'is_active': True,
                        'email_verified': True,
                        'role': user_role
                    }
                )

                if not created:
                    # Update existing user
                    user.cognito_sub = cognito_id
                    user.is_active = True
                    user.email_verified = True
                    user.role = user_role
                    user.save(update_fields=['cognito_sub', 'is_active', 'email_verified', 'role'])

                # Create user profile
                profile, _ = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'setup_complete': False,
                        'is_active': False,
                        'setup_status': 'not_started',
                        'created_at': timezone.now()
                    }
                )

                # Create onboarding progress
                progress, _ = OnboardingProgress.objects.get_or_create(
                    user=user,
                    defaults={
                        'onboarding_status': 'business-info',
                        'current_step': 'business-info',
                        'next_step': 'subscription',
                        'created_at': timezone.now()
                    }
                )
                
                # Create tenant schema immediately
                tenant = None
                try:
                    tenant = create_tenant_schema_for_user(user)
                    logger.info(f"Tenant schema created successfully during signup: {tenant.schema_name}")
                except Exception as e:
                    logger.error(f"Failed to create tenant schema during signup: {str(e)}")
                    # Continue with signup even if tenant creation fails
                    # We'll retry on subsequent requests

                response_data = {
                    "status": "success",
                    "userId": str(user.id),
                    "email": user.email,
                    "isOnboarded": user.is_onboarded
                }
                
                # Add tenant information to response if available
                if tenant:
                    response_data["tenantId"] = str(tenant.id)
                    response_data["schemaName"] = tenant.schema_name

                logger.info(f"User signup completed for {email}")
                return Response(response_data)

        except Exception as e:
            logger.error("Error processing signup: %s", str(e))
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateSessionView(APIView):
    permission_classes = [IsAuthenticated]

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