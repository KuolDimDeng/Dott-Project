from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from celery.result import AsyncResult
from django.utils import timezone

from .models import OnboardingProgress, UserProfile
from .tasks import setup_tenant_schema_task
from .utils import generate_unique_schema_name
from .locks import get_setup_lock, LockAcquisitionError

import logging
logger = logging.getLogger('Pyfactor')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_setup_progress(request):
    """
    Get the current setup progress for the authenticated user.
    This endpoint is polled by the frontend to track schema setup progress.
    """
    try:
        user = request.user
        profile = get_object_or_404(UserProfile, user=user)
        onboarding_progress = get_object_or_404(OnboardingProgress, user=user)

        # If there's an active setup task, get its progress
        if profile.setup_task_id:
            task_result = AsyncResult(profile.setup_task_id)
            if task_result.state == 'PENDING':
                progress = 0
                current_step = 'initializing'
            elif task_result.state == 'SUCCESS':
                progress = 100
                current_step = 'complete'
            elif task_result.state == 'FAILURE':
                progress = -1
                current_step = 'error'
            else:
                # Get progress from task state
                task_info = task_result.info or {}
                progress = task_info.get('progress', 0)
                current_step = task_info.get('step', 'processing')

            return Response({
                'progress': progress,
                'current_step': current_step,
                'status': task_result.state.lower(),
                'error': str(task_result.result) if task_result.failed() else None,
                'schema_name': profile.schema_name,
                'setup_status': profile.setup_status,
                'onboarding_status': onboarding_progress.onboarding_status
            })
        
        # No active task
        return Response({
            'progress': 100 if profile.setup_status == 'complete' else 0,
            'current_step': profile.setup_status,
            'status': profile.setup_status,
            'schema_name': profile.schema_name,
            'setup_status': profile.setup_status,
            'onboarding_status': onboarding_progress.onboarding_status
        })

    except Exception as e:
        logger.error(f"Error checking setup progress: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_setup(request):
    """
    Start the schema setup process for the authenticated user.
    """
    try:
        user = request.user
        profile = get_object_or_404(UserProfile, user=user)
        onboarding_progress = get_object_or_404(OnboardingProgress, user=user)

        # Check if setup is already complete
        if profile.setup_status == 'complete' and profile.schema_name:
            return Response({
                'status': 'already_complete',
                'schema_name': profile.schema_name
            })

        # Start setup task
        task = setup_tenant_schema_task.delay(
            user_id=str(user.id),
            business_id=str(profile.business_id)
        )

        # Update profile with task ID
        profile.setup_task_id = task.id
        profile.save(update_fields=['setup_task_id'])

        return Response({
            'status': 'started',
            'task_id': task.id
        })

    except Exception as e:
        logger.error(f"Error starting setup: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_setup(request):
    """
    Mark the setup process as complete.
    """
    try:
        user = request.user
        profile = get_object_or_404(UserProfile, user=user)
        onboarding_progress = get_object_or_404(OnboardingProgress, user=user)

        # Update profile status
        profile.setup_status = 'complete'
        profile.save(update_fields=['setup_status'])

        # Update onboarding progress
        onboarding_progress.current_step = 'complete'
        onboarding_progress.next_step = 'dashboard'
        onboarding_progress.onboarding_status = 'complete'
        onboarding_progress.save(update_fields=[
            'current_step',
            'next_step',
            'onboarding_status'
        ])

        return Response({'status': 'success'})

    except Exception as e:
        logger.error(f"Error completing setup: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
