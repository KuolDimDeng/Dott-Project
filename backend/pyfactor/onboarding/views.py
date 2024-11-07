# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/views.py

import re
import asyncio
import stripe
import traceback
import sys
from celery.result import AsyncResult
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async, async_to_sync
from django.core.cache import cache
from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
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
from datetime import datetime, timedelta
from django.db import transaction, connections, OperationalError, connection, transaction as db_transaction
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
from rest_framework.exceptions import AuthenticationFailed
from .tasks import setup_user_database_task  # Add this at the top with other imports


stripe.api_key = settings.STRIPE_SECRET_KEY

logger = get_logger()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_task_status(request, task_id):
    logger.info(f"Checking task status for task: {task_id}")
    try:
        task_result = AsyncResult(task_id)
        logger.info(f"Task state: {task_result.state}")
        
        if task_result.state == 'SUCCESS':
            return Response({
                'status': 'SUCCESS',
                'result': task_result.result
            }, status=status.HTTP_200_OK)
        elif task_result.state == 'FAILURE':
            error_info = {
                'error': str(task_result.result),
                'traceback': task_result.traceback
            }
            logger.error(f"Task failed: {error_info}")
            return Response({
                'status': 'FAILURE',
                'error': error_info
            }, status=status.HTTP_400_BAD_REQUEST)
        else:
            meta = task_result.info or {}
            return Response({
                'status': task_result.state,
                'progress': meta.get('progress', 0),
                'currentStep': meta.get('step', 'Processing')
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error checking task status: {str(e)}", exc_info=True)
        return Response({
            'status': 'ERROR',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_task(request, task_id):
    logger.info(f"Cancelling task: {task_id}")
    try:
        task_result = AsyncResult(task_id)
        task_result.revoke(terminate=True)
        return Response({'status': 'cancelled'}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GoogleTokenExchangeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Received Google token exchange request")
        google_token = request.data.get('token')
        if not google_token:
            logger.error("Google token not provided")
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify the Google token
            idinfo = id_token.verify_oauth2_token(
                google_token, 
                requests.Request(), 
                settings.GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=5
            )

            logger.info(f"Token 'iat': {idinfo.get('iat')}")
            logger.info(f"Token 'exp': {idinfo.get('exp')}")

            # Prepare user data with conditional fields
            user_data = {'email': idinfo['email']}
            if 'given_name' in idinfo:
                user_data['first_name'] = idinfo['given_name']
            if 'family_name' in idinfo:
                user_data['last_name'] = idinfo['family_name']

            with transaction.atomic():
                # Retrieve or create the user based on Google info
                user, created = User.objects.get_or_create(
                    email=idinfo['email'],
                    defaults=user_data
                )

                # Only create UserProfile if it doesn't exist
                if created:
                    UserProfile.objects.get_or_create(
                        user=user,
                        defaults={'is_business_owner': True}
                    )
                    logger.info(f"New user and UserProfile created: {user.email}")
                else:
                    logger.info(f"Existing user retrieved: {user.email}")

                # Create or update OnboardingProgress with email consistency
                onboarding_progress, _ = OnboardingProgress.objects.update_or_create(
                    user=user,
                    defaults={
                        'email': user.email,
                        'onboarding_status': 'step1',
                        'current_step': 1
                    }
                )
                logger.info(f"Onboarding progress status: {onboarding_progress.onboarding_status}")

                # Generate tokens for authentication
                refresh = RefreshToken.for_user(user)
                access = refresh.access_token

                return Response({
                    'refresh': str(refresh),
                    'access': str(access),
                    'user_id': user.id,
                    'onboarding_status': onboarding_progress.onboarding_status,
                }, status=status.HTTP_200_OK)
        
        except AuthenticationFailed as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        except IntegrityError as e:
            logger.error(f"Database integrity error during user creation/update: {str(e)}")
            return Response({'error': 'Account already exists'}, status=status.HTTP_409_CONFLICT)
        
        except Exception as e:
            logger.error(f"Unexpected error during token exchange: {str(e)}")
            return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StartOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        email = request.user.email
        onboarding, created = OnboardingProgress.objects.get_or_create(
            email=email,
            defaults={'onboarding_status': 'step1', 'current_step': 1}  # Set initial step to 1
        )
        
        # If onboarding already exists and is in initial status, reset `current_step` to 1
        if not created and onboarding.onboarding_status == 'step1':
            onboarding.current_step = 1
            onboarding.save()
        
        serializer = OnboardingProgressSerializer(onboarding)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class UpdateOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def put(self, request, step):
        logger.info(f"Update onboarding request for step {step}")
        logger.debug(f"Received request data: {request.data}")
        
        onboarding = get_object_or_404(OnboardingProgress, email=request.user.email)
        
        # Capture all expected fields from the request data
        data = request.data
        data['onboarding_status'] = f'step{step}'
        
        # Ensure essential fields are included in the onboarding process
        required_fields = ['business_name', 'business_type', 'country', 'legal_structure', 'date_founded']
        
        # Log missing fields for debugging purposes
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            logger.warning(f"Missing fields in onboarding data for step {step}: {missing_fields}")

        # Serialize and save onboarding data
        serializer = OnboardingProgressSerializer(onboarding, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Onboarding data updated for step {step}")
            return Response(serializer.data)
        
        # Log validation errors for debugging
        logger.error(f"Validation errors in onboarding data: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class CompleteOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def post(self, request):
        logger.info("Received request to complete onboarding process")
        
        user = request.user
        try:
            onboarding = OnboardingProgress.objects.get(user=user)
         #   self.complete_onboarding(user, onboarding)
            return Response({"message": "Onboarding completed successfully"}, status=status.HTTP_200_OK)
        
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.email}")
            return Response({"error": "Onboarding progress not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Unexpected error completing onboarding for user {user.email}: {str(e)}")
            return Response({"error": "Failed to complete onboarding"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def get_authenticators(self):
        return [JWTAuthentication()]


class CleanupOnboardingView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        expiration_time = timezone.now() - timedelta(hours=5)
        OnboardingProgress.objects.filter(created_at__lt=expiration_time).delete()
        return Response({"message": "Cleanup completed"}, status=status.HTTP_200_OK)
    

class OnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]  # Add this line

    def get(self, request):
        logger.info(f"Fetching onboarding status for user: {request.user.email}")
        try:
            # First try to get existing progress
            onboarding_progress = OnboardingProgress.objects.filter(user=request.user).first()
            
            if not onboarding_progress:
                # Create new progress if none exists
                onboarding_progress = OnboardingProgress.objects.create(
                    user=request.user,
                    email=request.user.email,
                    onboarding_status='step1',
                    current_step=1
                )
                logger.info(f"Created new onboarding progress for user: {request.user.email}")
            
            return Response({
                "onboarding_status": onboarding_progress.onboarding_status,
                "current_step": onboarding_progress.current_step,
                "email": onboarding_progress.email
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error in OnboardingStatusView for user {request.user.email}: {str(e)}")
            return Response({
                "error": "An unexpected error occurred",
                "onboarding_status": "step1",
                "current_step": 1
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    """
    Update the user's session by saving the new access and refresh tokens
    passed from the frontend after a token refresh.
    """
    user = request.user
    new_access_token = request.data.get('accessToken')
    new_refresh_token = request.data.get('refreshToken')

    # Check that both tokens are provided
    if not new_access_token or not new_refresh_token:
        logger.error("Access token or refresh token is missing")
        return Response(
            {'error': 'Both accessToken and refreshToken are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Validate the new refresh token using SimpleJWT
        RefreshToken(new_refresh_token)  # This will throw if invalid

        # Save tokens in the user's session (or as user model fields)
        # Here assuming you may have fields `access_token` and `refresh_token`
        user.access_token = new_access_token
        user.refresh_token = new_refresh_token
        user.save()

        logger.info("Session tokens updated successfully for user %s", user.email)
        return Response({'message': 'Session updated successfully'}, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error("Error updating session tokens: %s", str(e))
        return Response(
            {'error': 'Failed to update session tokens'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
class SaveStep1View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def post(self, request):
        logger.info(f"Saving step 1 data for user: {request.user.email}")
        user = request.user
        data = request.data
        
        try:
            logger.debug(f"Step 1 data received: {data}")
            date_founded = datetime.strptime(data.get('dateFounded'), '%Y-%m-%d').date() if data.get('dateFounded') else None

            onboarding_progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                defaults={
                    'email': user.email,
                    'onboarding_status': 'step1',
                    'current_step': 1
                }
            )
            logger.info(f"OnboardingProgress {'created' if created else 'retrieved'} for user: {user.email}")

            # Update the OnboardingProgress object
            onboarding_progress.first_name = data.get('firstName')
            onboarding_progress.last_name = data.get('lastName')
            onboarding_progress.business_name = data.get('businessName')
            onboarding_progress.business_type = data.get('industry')
            onboarding_progress.country = data.get('country')
            onboarding_progress.legal_structure = data.get('legalStructure')
            onboarding_progress.date_founded = date_founded
            onboarding_progress.onboarding_status = 'step2'
            onboarding_progress.current_step = 2
            onboarding_progress.save()
            logger.info(f"OnboardingProgress updated for user: {user.email}")

            # Generate a unique database name
            database_name = f"business_{user.id}_{data.get('businessName', '').lower().replace(' ', '_')}"
            
            # Create or update the Business with corrected field names
            business, business_created = Business.objects.get_or_create(
                owner=user,
                defaults={
                    'business_name': data.get('businessName'),  # Using business_name instead of name
                    'business_type': data.get('industry'),
                    'country': data.get('country'),
                    'legal_structure': data.get('legalStructure'),
                    'date_founded': date_founded,
                    'database_name': database_name
                }
            )
            
            if not business_created:
                # Update existing business if it was found
                business.business_name = data.get('businessName')
                business.business_type = data.get('industry')
                business.country = data.get('country')
                business.legal_structure = data.get('legalStructure')
                business.date_founded = date_founded
                business.save()
                
            logger.info(f"Business {'created' if business_created else 'updated'}: {business.business_name}")

            # Update the UserProfile with the business
            logger.debug("Updating User Profile with the business")
            user_profile, profile_created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'business': business,
                    'country': data.get('country')
                }
            )
            
            if not profile_created:
                user_profile.business = business
                user_profile.country = data.get('country')
                user_profile.save()
            
            logger.info(f"UserProfile {'created' if profile_created else 'updated'} for user: {user.email}")
            logger.info(f"Business associated with UserProfile: {user_profile.business}")

            # Update user's first and last name if provided
            if data.get('firstName') or data.get('lastName'):
                user.first_name = data.get('firstName', user.first_name)
                user.last_name = data.get('lastName', user.last_name)
                user.save()
                logger.info(f"User name updated: {user.get_full_name()}")

            logger.info(f"Step 1 data saved successfully for user: {user.email}")

            return Response({
                "message": "Step 1 data saved successfully",
                "business_id": str(business.id),
                "profile_id": str(user_profile.id)
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            logger.error(f"Error saving step 1 data: {str(e)}")
            return Response({"error": "Invalid date format. Please use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error saving step 1 data: {str(e)}", exc_info=True)
            return Response({"error": "Failed to save step 1 data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SaveStep2View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        logger.info(f"Saving step 2 data for user: {request.user.email}")
        user = request.user
        data = request.data
        
        try:
            logger.debug(f"Step 2 data received: {data}")
            onboarding_progress = OnboardingProgress.objects.get(user=user)
            logger.info(f"OnboardingProgress retrieved for user: {user.email}")

            onboarding_progress.subscription_type = data.get('selectedPlan')
            onboarding_progress.billing_cycle = data.get('billingCycle')
            
            if data.get('selectedPlan') == 'Professional':
                onboarding_progress.onboarding_status = 'step3'
                onboarding_progress.current_step = 3
            else:
                onboarding_progress.onboarding_status = 'step4'
                onboarding_progress.current_step = 4
            
            onboarding_progress.save()
            logger.info(f"OnboardingProgress updated for user: {user.email}")
            
            logger.info(f"Step 2 data saved successfully for user: {user.email}")
            return Response({"message": "Step 2 data saved successfully"}, status=status.HTTP_200_OK)
        except OnboardingProgress.DoesNotExist:
            logger.error(f"OnboardingProgress not found for user: {user.email}")
            return Response({"error": "Onboarding progress not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Unexpected error saving step 2 data: {str(e)}", exc_info=True)
            return Response({"error": "Failed to save step 2 data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class SaveStep3View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        logger.info("Saving step 3 data")
        user = request.user
        data = request.data
        
        try:
            onboarding_progress = OnboardingProgress.objects.get(user=user)
            onboarding_progress.payment_completed = data.get('paymentCompleted', False)
            onboarding_progress.onboarding_status = 'step4'
            onboarding_progress.current_step = 4
            onboarding_progress.save()
            
            logger.info(f"Step 3 data saved for user: {user.email}")
            return Response({"message": "Step 3 data saved successfully"}, status=status.HTTP_200_OK)
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.email}")
            return Response({"error": "Onboarding progress not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error saving step 3 data: {str(e)}")
            return Response({"error": "Failed to save step 3 data"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


   
class SaveStep4View(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def post(self, request):
        logger.info(f"Initiating database creation for user: {request.user.email}")
        user = request.user
        
        try:
            with transaction.atomic():
                onboarding_progress = OnboardingProgress.objects.get(user=user)
                business = Business.objects.get(owner=user)
                
                # Check if this is a start request
                if request.path.endswith('/start/'):
                    logger.info(f"Starting database setup task for user: {user.email}")
                    # Start Celery task
                    task = setup_user_database_task.delay(
                        str(user.id),
                        str(business.id)
                    )
                    logger.info(f"Created database setup task with ID: {task.id}")
                    return Response({
                        "message": "Database setup initiated",
                        "taskId": task.id,
                        "status": "processing"
                    }, status=status.HTTP_202_ACCEPTED)
                else:
                    # Handle regular save request
                    if 'businessName' in request.data:
                        onboarding_progress.business_name = request.data['businessName']
                        onboarding_progress.save()

                    if request.data.get('status') == 'complete':
                        onboarding_progress.onboarding_status = 'complete'
                        onboarding_progress.current_step = 0
                        onboarding_progress.save()
                        logger.info(f"Onboarding completed for user: {user.email}")
                    
                    return Response({
                        "message": "Step 4 data saved successfully",
                        "status": onboarding_progress.onboarding_status
                    }, status=status.HTTP_200_OK)

        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.email}")
            return Response({"error": "Onboarding progress not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception(f"Error in SaveStep4View for user {user.email}: {str(e)}")
            return Response({"error": "Failed to process step 4"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OnboardingSuccessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        session_id = request.data.get('sessionId')

        if not session_id:
            return Response({"error": "No session ID provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify the session with Stripe
            session = stripe.checkout.Session.retrieve(session_id)

            # Verify that the session belongs to this user
            if session.client_reference_id != str(user.id):
                return Response({"error": "Invalid session"}, status=status.HTTP_400_BAD_REQUEST)

            # Update user's subscription status
            onboarding_progress = OnboardingProgress.objects.get(user=user)
            onboarding_progress.payment_completed = True
            onboarding_progress.onboarding_status = 'complete'
            onboarding_progress.current_step = 0
            onboarding_progress.save()

            # Create or update the subscription
            subscription, created = Subscription.objects.update_or_create(
                business=user.userprofile.business,
                defaults={
                    'subscription_type': 'professional',
                    'start_date': timezone.now().date(),
                    'is_active': True,
                    'billing_cycle': 'monthly' if session.mode == 'subscription' else 'annual'
                }
            )

            logger.info(f"Onboarding completed and subscription created for user: {user.email}")
            return Response({"message": "Onboarding completed successfully"})
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error during onboarding success: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except OnboardingProgress.DoesNotExist:
            logger.error(f"Onboarding progress not found for user: {user.email}")
            return Response({"error": "Onboarding progress not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Unexpected error in OnboardingSuccessView: {str(e)}")
            return Response({"error": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)