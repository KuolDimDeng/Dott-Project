# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/views.py

from django.conf import settings
from django.shortcuts import get_object_or_404
from requests import request
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from users.utils import create_user_database, setup_user_database
from .models import OnboardingProgress
from .serializers import OnboardingProgressSerializer
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from users.models import User, UserProfile
from business.models import Business, Subscription
from finance.models import Account
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from pyfactor.logging_config import get_logger
from google.oauth2 import id_token
from google.auth.transport import requests
from django.db import IntegrityError
from celery import shared_task

logger = get_logger()

class GoogleTokenExchangeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Google token exchange request")
        logger.debug(f"Received request data: {request.data}")
        google_token = request.data.get('token')
        try:
            # Verify the Google token
            idinfo = id_token.verify_oauth2_token(
                google_token, 
                requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            # Get or create the user based on the Google info
            user, created = User.objects.get_or_create(
                email=idinfo['email'],
                defaults={
                    'first_name': idinfo.get('given_name', ''),
                    'last_name': idinfo.get('family_name', ''),
                }
            )

            # Create or update OnboardingProgress
            onboarding_progress, _ = OnboardingProgress.objects.update_or_create(
                user=user,
                email=user.email,
                defaults={'onboarding_status': 'step1'}
            )

            # Create tokens for your system
            logger.info(f"User created or retrieved: {user.email}")
            logger.info(f"Onboarding status: {onboarding_progress.onboarding_status}")
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'onboarding_status': onboarding_progress.onboarding_status,
            })
        except ValueError as e:
            logger.error(f"Invalid Google token: {str(e)}")
            return Response({'error': f'Invalid token: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class StartOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        email = request.user.email
        onboarding, created = OnboardingProgress.objects.get_or_create(
            email=email,
            defaults={'onboarding_status': 'step1'}
        )
        serializer = OnboardingProgressSerializer(onboarding)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class UpdateOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def put(self, request, step):
        logger.info(f"Update onboarding request for step {step}")
        logger.debug(f"Received request data: {request.data}")
        onboarding = get_object_or_404(OnboardingProgress, email=request.user.email)
        
        data = request.data
        data['onboarding_status'] = f'step{step}'
        
        serializer = OnboardingProgressSerializer(onboarding, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CompleteOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def post(self, request):
        logger.info("Complete onboarding request")
        logger.debug(f"Received request data: {request.data}")
        onboarding = get_object_or_404(OnboardingProgress, email=request.user.email)
        
        # Update onboarding status to complete
        onboarding.onboarding_status = 'complete'
        onboarding.save()
        
        # Update user
        user = request.user
        user.first_name = onboarding.first_name
        user.last_name = onboarding.last_name
        user.save()

        # Create or update user profile
        UserProfile.objects.update_or_create(user=user)

        # Create business
        business = Business.objects.create(
            owner=user,
            name=onboarding.business_name,
            business_type=onboarding.business_type,
            country=onboarding.country,
            legal_structure=onboarding.legal_structure,
            date_founded=onboarding.date_founded
        )

        # Create subscription
        Subscription.objects.create(
            business=business,
            subscription_type=request.data.get('subscription_type', 'professional'),
            billing_cycle=request.data.get('billing_cycle', 'monthly'),
            start_date=timezone.now().date(),
            is_active=True
        )

        # Create dynamic database for user
        database_name = create_user_database(user, business)

        # Setup user database
        setup_user_database(database_name, user)

        # Delete the onboarding record
        onboarding.delete()

        return Response({"message": "Onboarding completed successfully"}, status=status.HTTP_200_OK)
    
    def get_authenticators(self):
        authenticators = super().get_authenticators()
        return [auth() for auth in authenticators]

class CleanupOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        expiration_time = timezone.now() - timedelta(hours=5)
        OnboardingProgress.objects.filter(created_at__lt=expiration_time).delete()
        return Response({"message": "Cleanup completed"}, status=status.HTTP_200_OK)
    
class OnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        try:
            onboarding_progress = OnboardingProgress.objects.get(user=request.user)
            return Response({
                'onboarding_status': onboarding_progress.onboarding_status,
                'current_step': onboarding_progress.current_step
            })
        except OnboardingProgress.DoesNotExist:
            return Response({
                'onboarding_status': 'step1',
                'current_step': 1
            })
        
@shared_task
def cleanup_expired_onboarding():
    expired_time = timezone.now() - timezone.timedelta(hours=5)
    OnboardingProgress.objects.filter(created_at__lt=expired_time).delete()
    
class SaveEmailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logger.info("Received request to save email")
        logger.debug(f"Received request data: {request.data}")
        
        email = request.data.get('email')
        
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = request.user
            
            onboarding_progress, created = OnboardingProgress.objects.update_or_create(
                user=user,
                defaults={
                    'email': email,
                    'onboarding_status': 'step1'
                }
            )
            
            if created:
                logger.info(f"New OnboardingProgress created for user {user.id} with email {email}")
            else:
                logger.info(f"Updated existing OnboardingProgress for user {user.id} with email {email}")
            
            return Response({
                "message": "Email saved successfully, onboarding status is step1",
                "is_new_record": created
            }, status=status.HTTP_200_OK)
        
        except ObjectDoesNotExist:
            logger.error(f"User {request.user.id} not found")
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error saving email for user {request.user.id}: {str(e)}")
            return Response({"error": "Failed to save email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_session(request):
    user = request.user
    new_access_token = request.data.get('accessToken')
    new_refresh_token = request.data.get('refreshToken')

    if not new_access_token or not new_refresh_token:
        return Response({'error': 'Both accessToken and refreshToken are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Validate the new refresh token
        RefreshToken(new_refresh_token)

        # Update the user's tokens
        user.access_token = new_access_token
        user.refresh_token = new_refresh_token
        user.save()

        return Response({'message': 'Session updated successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)