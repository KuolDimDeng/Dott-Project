from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.serializers import UserProfileSerializer
from business.models import Business
from .models import UserProfile
from pyfactor.logging_config import get_logger
from django.db import connections, transaction as db_transaction




logger = get_logger()



from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from users.serializers import UserProfileSerializer
from business.models import Business
from .models import UserProfile
from pyfactor.logging_config import get_logger
from django.db import connections, transaction as db_transaction

logger = get_logger()

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, *args, **kwargs):
        logger.debug("ProfileView: Received request to retrieve user profile.")
        try:
            with db_transaction.atomic():
                user_profile = UserProfile.objects.select_related('user', 'business').get(user=request.user)
                logger.info(f"Retrieved UserProfile for user: {request.user.email}")

                business_data = None
                if user_profile.business:
                    business = user_profile.business
                    logger.info("Business information retrieved for user %s", request.user)
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

                profile_data = UserProfileSerializer(user_profile).data
                profile_data['business'] = business_data
                profile_data['is_onboarded'] = request.user.is_onboarded
                profile_data['country'] = str(user_profile.country) if user_profile.country else None

                # Use the database_status from the UserProfile model
                profile_data['database_status'] = user_profile.database_status

                logger.info("Successfully retrieved profile data for user %s", request.user)
                logger.debug(f"Profile data: {profile_data}")

                return JsonResponse(profile_data, status=status.HTTP_200_OK)

        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile not found for user: {request.user.email}")
            return JsonResponse({"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Unexpected error in ProfileView: %s", str(e))
            return JsonResponse({"error": "An unexpected error occurred"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)