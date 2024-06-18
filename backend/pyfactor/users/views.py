from django.db import connections, transaction, DatabaseError
from django.http import JsonResponse
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.conf import settings
from rest_framework.views import APIView
from .models import User, UserProfile
from .serializers import CustomRegisterSerializer, CustomTokenObtainPairSerializer, CustomAuthTokenSerializer
from pyfactor.logging_config import setup_logging
import traceback
import jwt

logger = setup_logging()

class RegisterView(generics.CreateAPIView):
    serializer_class = CustomRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        logger.debug("Received request data: %s", request.data)
        serializer = self.get_serializer(data=request.data)
        logger.debug('Serializer initialized')

        try:
            logger.info('Validating data...')
            serializer.is_valid(raise_exception=True)
            logger.info('Data validated: %s', serializer.validated_data)

            user = serializer.save()
            logger.info('User created: %s', user)

            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
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

        token, created = Token.objects.get_or_create(user=user)
        logger.info('Generated token: %s', token.key)

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
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
        })

# Add this to your views to register the CustomAuthToken view
custom_auth_token_view = CustomAuthToken.as_view()

class ProfileView(APIView):
    logger.debug('Profile view called.')
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, *args, **kwargs):
        logger.debug('Authorization header: %s', request.META.get('HTTP_AUTHORIZATION'))

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.error('Invalid or missing authorization header.')
            return JsonResponse({'error': 'Invalid or missing authorization header.'}, status=401)
        
        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            logger.debug(f'Decoded token: {decoded_token}')
        except jwt.exceptions.InvalidTokenError as e:
            logger.error(f'Invalid token: {e}')
            return JsonResponse({'error': 'Invalid token.'}, status=401)

        user_id = decoded_token.get('user_id')
        try:
            user = User.objects.get(id=user_id)
            user_profile = self.get_user_profile(user)
            if user_profile:
                logger.debug(f'User profile: {user_profile}')
                # Log the user's specific database name
                logger.debug(f'User database name: {user_profile.database_name}')
                return JsonResponse(user_profile.to_dict(), safe=False)
            else:
                logger.error(f'Failed to retrieve user profile for user: {user}')
                return JsonResponse({'error': 'Failed to retrieve user profile.'}, status=500)
        except User.DoesNotExist:
            logger.warning("User does not exist.")
            return JsonResponse({'error': 'User does not exist.'}, status=401)
        except Exception as e:
            logger.exception("An error occurred while retrieving the user profile: %s", str(e))
            return JsonResponse({'error': 'Internal server error.'}, status=500)

    def get_user_profile(self, user):
        logger.debug(f'Retrieving user profile for user: {user}')
        try:
            return UserProfile.objects.using('default').select_related('user').get(user=user)
        except UserProfile.DoesNotExist:
            logger.error("UserProfile does not exist for user: %s", user)
            return None
        except Exception as e:
            logger.error(f"Error retrieving user profile: {str(e)}")
            return None

profile_view = ProfileView.as_view()
