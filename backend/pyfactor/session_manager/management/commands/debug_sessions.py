"""
Management command to debug session issues
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from session_manager.models import UserSession
from custom_auth.models import User


class Command(BaseCommand):
    help = 'Debug session issues by listing active sessions'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Filter sessions by user email'
        )
        parser.add_argument(
            '--session-id',
            type=str,
            help='Look up specific session by ID'
        )
        parser.add_argument(
            '--show-expired',
            action='store_true',
            help='Also show expired sessions'
        )
    
    def handle(self, *args, **options):
        email = options.get('email')
        session_id = options.get('session-id')
        show_expired = options.get('show_expired', False)
        
        if session_id:
            # Look up specific session
            try:
                session = UserSession.objects.get(session_id=session_id)
                self.stdout.write(f"\nSession Details for {session_id}:")
                self.stdout.write(f"  User: {session.user.email}")
                self.stdout.write(f"  Created: {session.created_at}")
                self.stdout.write(f"  Expires: {session.expires_at}")
                self.stdout.write(f"  Is Active: {session.is_active}")
                self.stdout.write(f"  Is Expired: {session.is_expired()}")
                self.stdout.write(f"  Last Activity: {session.last_activity}")
                self.stdout.write(f"  Tenant: {session.tenant.name if session.tenant else 'None'}")
                self.stdout.write(f"  Needs Onboarding: {session.needs_onboarding}")
                self.stdout.write(f"  Onboarding Completed: {session.onboarding_completed}")
                
                if session.is_expired():
                    self.stdout.write(self.style.WARNING(f"  ⚠️  This session has EXPIRED"))
                if not session.is_active:
                    self.stdout.write(self.style.WARNING(f"  ⚠️  This session is INACTIVE"))
                    
            except UserSession.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Session {session_id} not found"))
            return
        
        # List sessions
        sessions = UserSession.objects.all()
        
        if email:
            try:
                user = User.objects.get(email=email)
                sessions = sessions.filter(user=user)
                self.stdout.write(f"\nSessions for user: {email}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User {email} not found"))
                return
        else:
            self.stdout.write("\nAll sessions:")
        
        if not show_expired:
            sessions = sessions.filter(expires_at__gt=timezone.now(), is_active=True)
            self.stdout.write("(Showing only active, non-expired sessions)")
        
        sessions = sessions.order_by('-created_at')
        
        if not sessions.exists():
            self.stdout.write(self.style.WARNING("No sessions found"))
            return
        
        self.stdout.write(f"\nFound {sessions.count()} sessions:\n")
        
        for session in sessions[:20]:  # Show max 20 sessions
            status_flags = []
            if not session.is_active:
                status_flags.append("INACTIVE")
            if session.is_expired():
                status_flags.append("EXPIRED")
            
            status = f" [{', '.join(status_flags)}]" if status_flags else " [ACTIVE]"
            
            self.stdout.write(
                f"{session.session_id} - {session.user.email} - "
                f"Created: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')} - "
                f"Expires: {session.expires_at.strftime('%Y-%m-%d %H:%M:%S')}"
                f"{status}"
            )
        
        if sessions.count() > 20:
            self.stdout.write(f"\n... and {sessions.count() - 20} more sessions")
        
        # Show summary
        self.stdout.write(f"\nSummary:")
        active_count = UserSession.objects.filter(is_active=True, expires_at__gt=timezone.now()).count()
        expired_count = UserSession.objects.filter(expires_at__lte=timezone.now()).count()
        inactive_count = UserSession.objects.filter(is_active=False).count()
        
        self.stdout.write(f"  Active sessions: {active_count}")
        self.stdout.write(f"  Expired sessions: {expired_count}")
        self.stdout.write(f"  Inactive sessions: {inactive_count}")
        self.stdout.write(f"  Total sessions: {UserSession.objects.count()}")