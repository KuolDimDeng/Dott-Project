# Django imports
from django.http import JsonResponse
from django.db import connections, transaction as db_transaction, IntegrityError

# REST framework imports
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

# Model imports
from business.models import Business
from .models import UserProfile, User
from .serializers import UserProfileSerializer


# Utility imports
from pyfactor.logging_config import get_logger

logger = get_logger()

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, *args, **kwargs):
        logger.debug("ProfileView: Received request to retrieve user profile.")
        try:
            # Add token validation check
            if not request.user.is_authenticated:
                logger.warning("User not authenticated, redirecting to signin")
                return Response(
                    {"error": "Authentication required"}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )

            with db_transaction.atomic():
                user_profile = (UserProfile.objects
                    .select_related('user', 'business')
                    .get(user=request.user))
                
                logger.info(f"Retrieved UserProfile for user: {request.user.email}")

                # Add session check
                if not getattr(request, '_auth', None):
                    logger.warning("No active session found")
                    return Response(
                        {"error": "Session expired"}, 
                        status=status.HTTP_401_UNAUTHORIZED
                    )

                serializer = UserProfileSerializer(user_profile)
                profile_data = serializer.data

                # Add session refresh logic
                response = Response(profile_data, status=status.HTTP_200_OK)
                if hasattr(request, 'auth') and hasattr(request.auth, 'access_token'):
                    response.set_cookie(
                        'sessionId',
                        request.auth.access_token,
                        httponly=True,
                        secure=True
                    )
                
                logger.info(f"Successfully retrieved profile data for user {request.user}")
                return response

        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile not found for user: {request.user.email}")
            return Response(
                {"error": "User profile not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error("Unexpected error in ProfileView", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )