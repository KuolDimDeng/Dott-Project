from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.contrib.auth import get_user_model
from ..models import UserProfile
from onboarding.models import OnboardingProgress
from ..serializers import UserSerializer
from django.utils import timezone
from ..authentication import CognitoAuthentication
from rest_framework.permissions import AllowAny
from ..utils import validate_cognito_token
from django.core.exceptions import ValidationError
from pyfactor.logging_config import get_logger

logger = get_logger()
User = get_user_model()

class SignupView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        try:
            data = request.data
            logger.debug("Processing signup request:", {
                'email': data.get('email'),
                'cognito_id': data.get('cognito_id')
            })

            # Validate required fields
            required_fields = ['email', 'first_name', 'last_name', 'cognito_id']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")

            # Check if user already exists
            if User.objects.filter(email=data['email']).exists():
                user = User.objects.get(email=data['email'])
                if user.cognito_id and user.cognito_id != data['cognito_id']:
                    raise ValidationError("Email already registered with different account")
                # Update existing user with Cognito ID
                user.cognito_id = data['cognito_id']
                user.save()
            else:
                # Create new user
                user = User.objects.create(
                    email=data['email'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    cognito_id=data['cognito_id'],
                    is_active=True
                )

            # Create or update user profile
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'email_verified': True,
                    'is_active': False,
                    'setup_status': 'not_started',
                    'created_at': timezone.now()
                }
            )

            # Create or update onboarding progress
            progress, _ = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'onboarding_status': 'business-info',
                    'current_step': 'business-info',
                    'next_step': 'subscription',
                    'created_at': timezone.now()
                }
            )

            logger.info("User signup completed successfully:", {
                'user_id': str(user.id),
                'email': user.email,
                'cognito_id': user.cognito_id
            })

            return Response({
                'success': True,
                'user_id': str(user.id),
                'message': 'User created successfully',
                'next_step': 'business-info'
            }, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            logger.error("Signup validation error:", {
                'error': str(e),
                'data': request.data
            })
            return Response({
                'error': str(e),
                'code': 'validation_error'
            }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error("Signup error:", {
                'error': str(e),
                'data': request.data
            })
            return Response({
                'error': 'Failed to create user',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)