from django.db import connections, transaction, DatabaseError
from django.http import JsonResponse
from rest_framework import generics, status, serializers, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework_simplejwt.tokens import RefreshToken
from business.models import Business
from .models import User, UserProfile
from .serializers import CustomRegisterSerializer, CustomTokenObtainPairSerializer, CustomAuthTokenSerializer, UserProfileSerializer
from pyfactor.logging_config import get_logger
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

import traceback
import jwt

logger = get_logger()

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    logger.debug('RegisterView')
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomRegisterSerializer
    
    def create(self, request, *args, **kwargs):
        logger.debug("Received request data: %s", request.data)
        serializer = self.get_serializer(data=request.data)
        logger.debug('Serializer initialized')

        try:
            logger.info('Validating data...')
            serializer = self.get_serializer(data=request.data)

            serializer.is_valid(raise_exception=True)
            logger.info('Data validated: %s', serializer.validated_data)
            
            
            # Create the user
            logger.info("Saving user...")
            user = serializer.save()
            logger.info('User created: %s', user)
            
            # Generate token for the newly registered user
            logger.debug('Generating JWT token...')
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            return Response({
                "message": "User registered successfully",
                "token": access_token,
                "user_id": user.id
            }, status=status.HTTP_201_CREATED)        
        except serializers.ValidationError as e:
            logger.error('Validation errors: %s', e.detail)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Error creating user: %s', e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

register_view = RegisterView.as_view()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CustomAuthToken(ObtainAuthToken):
    serializer_class = CustomAuthTokenSerializer

    def post(self, request, *args, **kwargs):
        logger.debug("Received request data: %s", request.data)
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        logger.info('User: %s', user)

        if user is None:
            logger.warning('Invalid credentials: User is none')
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

         # Generate JWT token instead of using Token model
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        # Fetch the user's specific database name and log it
        try:
            user_profile = UserProfile.objects.get(user=user)
            database_name = user_profile.database_name
            logger.debug('User database name: %s', database_name)
        except UserProfile.DoesNotExist:
            logger.error('UserProfile does not exist for user: %s', user)
            return Response({'error': 'UserProfile does not exist.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.exception('An error occurred while fetching the user profile: %s', str(e))
            return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'token': access_token,
            'user_id': user.id,
            'email': user.email,
        })

# Add this to your views to register the CustomAuthToken view
custom_auth_token_view = CustomAuthToken.as_view()

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_user_profile(self, user):
        try:
            return UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return None

    def get(self, request, *args, **kwargs):
            user = request.user  # This is the authenticated user

            try:
                user_profile = UserProfile.objects.get(user=user)
                
                # Ensure the user's database connection exists
                router = UserDatabaseRouter()
                if user_profile.database_name and user_profile.database_name not in connections.databases:
                    try:
                        router.create_dynamic_database(user_profile.database_name)
                    except Exception as e:
                        logger.error(f"Error creating/configuring database: {str(e)}")
                        return JsonResponse({'error': 'Error accessing user database'}, status=500)

                # Fetching business data
                try:
                    business = user_profile.business
                    business_data = {
                        'id': str(business.id),
                        'business_num': business.business_num,
                        'name': business.name,
                        'business_type': business.business_type,
                        'street': business.street,
                        'city': business.city,
                        'state': business.state,
                        'postcode': business.postcode,
                        'country': str(business.country),
                        'address': business.address,
                        'email': business.email,
                        'phone_number': business.phone_number,
                        'database_name': business.database_name,
                        'created_at': business.created_at,
                        'modified_at': business.modified_at,
                    }
                except Business.DoesNotExist:
                    business_data = None

                profile_data = user_profile.to_dict()
                profile_data['business'] = business_data

                logger.debug(f'User profile: {profile_data}')
                logger.debug(f'User database name: {user_profile.database_name}')
                return JsonResponse(profile_data, safe=False)
            except UserProfile.DoesNotExist:
                logger.error(f'Failed to retrieve user profile for user: {user}')
                return JsonResponse({'error': 'Failed to retrieve user profile.'}, status=500)
            except Exception as e:
                logger.exception("An error occurred while retrieving the user profile: %s", str(e))
                return JsonResponse({'error': 'Internal server error.'}, status=500)

profile_view = ProfileView.as_view()
