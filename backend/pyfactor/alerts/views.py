from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import Alert, UserAlert
from .serializers import AlertSerializer, UserAlertSerializer
from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from pyfactor.logging_config import get_logger
from django.views.decorators.csrf import csrf_exempt


logger = get_logger()


User = get_user_model()


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def user_alerts(self, request):
        user_alerts = UserAlert.objects.filter(user=request.user).select_related('alert')
        serializer = UserAlertSerializer(user_alerts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def mark_as_read(self, request, pk=None):
        try:
            user_alert = UserAlert.objects.get(user=request.user, alert_id=pk)
            user_alert.is_read = True
            user_alert.read_at = timezone.now()
            user_alert.save()
            return Response({'status': 'Alert marked as read'})
        except UserAlert.DoesNotExist:
            return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)


# Add a new view to check if user is admin
@api_view(['GET'])
def is_admin(request):
    return Response({'is_admin': request.user.is_staff})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_alerts(request):
    alerts = UserAlert.objects.filter(user=request.user)
    serializer = UserAlertSerializer(alerts, many=True)
    return Response(serializer.data)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_global_alert(request):
    logger.debug(f'Received alert request: {request.data}')
    logger.info(f"Received request: {request.method} {request.path}")
    logger.info(f"Request data: {request.data}")
    logger.info(f"User: {request.user}, Is admin: {request.user.is_staff}")
    
    
    if not request.user.is_staff:
        logger.warning(f'Non-admin user {request.user.username} attempted to send global alert')
        return Response({'error': 'You do not have permission to send global alerts'}, status=403)

    subject = request.data.get('subject')
    message = request.data.get('message')
    priority = request.data.get('priority', 'medium')

    if not subject or not message:
        logger.error('Missing subject or message in global alert request')
        return Response({'error': 'Subject and message are required'}, status=400)

    try:
        alert = Alert.objects.create(
            subject=subject,
            message=message,
            priority=priority,
            is_global=True
        )

        for user in User.objects.all():
            UserAlert.objects.create(user=user, alert=alert)

        logger.info(f'Global alert created successfully: {alert.id}')
        return Response({'message': 'Global alert sent successfully'}, status=201)
    except Exception as e:
        logger.exception(f'Error creating global alert: {str(e)}')
        return Response({'error': 'An error occurred while creating the alert'}, status=500)