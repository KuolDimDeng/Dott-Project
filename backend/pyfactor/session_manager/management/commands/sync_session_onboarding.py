"""
Django management command to sync existing sessions with OnboardingProgress

Usage:
    python manage.py sync_session_onboarding
    python manage.py sync_session_onboarding --user admin@dottapps.com
    python manage.py sync_session_onboarding --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.utils import timezone
from datetime import timedelta
import logging

from session_manager.models import UserSession
from onboarding.models import OnboardingProgress
from django.contrib.auth import get_user_model

User = get_user_model()

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync existing session onboarding status with OnboardingProgress table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Sync sessions for a specific user email'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )
        parser.add_argument(
            '--active-only',
            action='store_true',
            default=True,
            help='Only sync active sessions (default: True)'
        )

    def handle(self, *args, **options):
        user_email = options.get('user')
        dry_run = options.get('dry_run')
        active_only = options.get('active_only')
        
        self.stdout.write(self.style.SUCCESS('Starting session onboarding sync...'))
        
        # Build query
        sessions_query = UserSession.objects.all()
        
        if active_only:
            sessions_query = sessions_query.filter(
                is_active=True,
                expires_at__gt=timezone.now()
            )
        
        if user_email:
            try:
                user = User.objects.get(email=user_email)
                sessions_query = sessions_query.filter(user=user)
                self.stdout.write(f"Filtering sessions for user: {user_email}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User not found: {user_email}"))
                return
        
        # Get all sessions to process
        sessions = sessions_query.select_related('user').order_by('-created_at')
        total_sessions = sessions.count()
        
        self.stdout.write(f"Found {total_sessions} sessions to check")
        
        updated_count = 0
        no_progress_count = 0
        already_synced_count = 0
        error_count = 0
        
        for session in sessions:
            try:
                # Get user's onboarding progress
                try:
                    progress = OnboardingProgress.objects.get(user=session.user)
                except OnboardingProgress.DoesNotExist:
                    no_progress_count += 1
                    self.stdout.write(
                        f"  No OnboardingProgress for {session.user.email} "
                        f"(session {session.session_id})"
                    )
                    continue
                
                # Determine correct values
                needs_onboarding = progress.onboarding_status != 'complete'
                onboarding_completed = progress.onboarding_status == 'complete'
                onboarding_step = progress.current_step if progress.current_step else 'business_info'
                
                # Check if update is needed
                if (session.needs_onboarding == needs_onboarding and
                    session.onboarding_completed == onboarding_completed and
                    session.onboarding_step == onboarding_step):
                    already_synced_count += 1
                    continue
                
                # Log what will be updated
                self.stdout.write(
                    f"\n  Updating session {session.session_id} for {session.user.email}:"
                )
                self.stdout.write(
                    f"    OnboardingProgress status: {progress.onboarding_status}"
                )
                self.stdout.write(
                    f"    needs_onboarding: {session.needs_onboarding} → {needs_onboarding}"
                )
                self.stdout.write(
                    f"    onboarding_completed: {session.onboarding_completed} → {onboarding_completed}"
                )
                self.stdout.write(
                    f"    onboarding_step: {session.onboarding_step} → {onboarding_step}"
                )
                
                if not dry_run:
                    # Update session
                    with db_transaction.atomic():
                        UserSession.objects.filter(pk=session.pk).update(
                            needs_onboarding=needs_onboarding,
                            onboarding_completed=onboarding_completed,
                            onboarding_step=onboarding_step,
                            updated_at=timezone.now()
                        )
                    self.stdout.write(self.style.SUCCESS("    ✓ Updated"))
                else:
                    self.stdout.write(self.style.WARNING("    [DRY RUN - no changes made]"))
                
                updated_count += 1
                
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  Error processing session {session.session_id}: {str(e)}"
                    )
                )
                logger.exception(f"Error syncing session {session.session_id}")
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("Session sync complete!"))
        self.stdout.write(f"Total sessions checked: {total_sessions}")
        self.stdout.write(f"Sessions updated: {updated_count}")
        self.stdout.write(f"Sessions already synced: {already_synced_count}")
        self.stdout.write(f"Users without OnboardingProgress: {no_progress_count}")
        self.stdout.write(f"Errors: {error_count}")
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING("\nThis was a dry run. No changes were made.")
            )
            self.stdout.write("Run without --dry-run to apply changes.")