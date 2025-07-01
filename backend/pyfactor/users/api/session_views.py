"""
Session management API views for user account
"""
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from session_manager.models import UserSession, SessionEvent
from pyfactor.logging_config import get_logger

# Try to import user_agents, fallback to basic parsing if not available
try:
    import user_agents
    HAS_USER_AGENTS = True
except ImportError:
    HAS_USER_AGENTS = False
    # Create a mock user agent parser for fallback
    class MockUserAgent:
        def __init__(self, ua_string=''):
            # Basic mobile detection
            ua_lower = ua_string.lower()
            self.is_mobile = any(x in ua_lower for x in ['mobile', 'android', 'iphone'])
            self.is_tablet = any(x in ua_lower for x in ['tablet', 'ipad'])
            
            # Basic browser detection
            browser_family = 'Unknown'
            if 'chrome' in ua_lower:
                browser_family = 'Chrome'
            elif 'firefox' in ua_lower:
                browser_family = 'Firefox'
            elif 'safari' in ua_lower and 'chrome' not in ua_lower:
                browser_family = 'Safari'
            elif 'edge' in ua_lower:
                browser_family = 'Edge'
            
            # Basic OS detection
            os_family = 'Unknown'
            if 'windows' in ua_lower:
                os_family = 'Windows'
            elif 'mac' in ua_lower or 'darwin' in ua_lower:
                os_family = 'Mac OS X'
            elif 'linux' in ua_lower:
                os_family = 'Linux'
            elif 'android' in ua_lower:
                os_family = 'Android'
            elif 'ios' in ua_lower or 'iphone' in ua_lower or 'ipad' in ua_lower:
                os_family = 'iOS'
            
            self.browser = type('obj', (object,), {'family': browser_family, 'version_string': ''})
            self.os = type('obj', (object,), {'family': os_family, 'version_string': ''})
    
    class MockUserAgents:
        @staticmethod
        def parse(ua_string):
            return MockUserAgent(ua_string)
    
    user_agents = MockUserAgents()

logger = get_logger()

if not HAS_USER_AGENTS:
    logger.warning("user_agents module not available. Using basic user agent parsing.")


class UserSessionListView(APIView):
    """
    List all active sessions for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get all active sessions for the current user
        """
        try:
            logger.info(f"Fetching sessions for user: {request.user.email}")
            
            # Get all active sessions for the user
            sessions = UserSession.objects.filter(
                user=request.user,
                is_active=True,
                expires_at__gt=timezone.now()
            ).order_by('-last_activity')
            
            # Get current session ID from request
            current_session_id = None
            if hasattr(request, 'session_obj') and request.session_obj:
                current_session_id = str(request.session_obj.session_id)
            
            session_list = []
            for session in sessions:
                # Parse user agent
                ua_string = session.user_agent or "Unknown"
                user_agent = user_agents.parse(ua_string)
                
                # Determine device type
                if user_agent.is_mobile:
                    device_type = 'mobile'
                elif user_agent.is_tablet:
                    device_type = 'tablet'
                else:
                    device_type = 'desktop'
                
                # Format session data
                session_data = {
                    "id": str(session.session_id),
                    "device_type": device_type,
                    "browser": f"{user_agent.browser.family} {user_agent.browser.version_string}" if user_agent.browser.family else "Unknown Browser",
                    "os": f"{user_agent.os.family} {user_agent.os.version_string}" if user_agent.os.family else "Unknown OS",
                    "ip_address": session.ip_address,
                    "location": self._get_location_from_ip(session.ip_address),
                    "last_active": self._format_last_active(session.last_activity),
                    "created_at": session.created_at.isoformat(),
                    "expires_at": session.expires_at.isoformat(),
                    "is_current": str(session.session_id) == current_session_id,
                    "session_type": session.session_type,
                }
                
                session_list.append(session_data)
            
            return Response({
                "sessions": session_list,
                "total": len(session_list)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching user sessions: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch sessions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_location_from_ip(self, ip_address):
        """
        Get approximate location from IP address
        For now, returns a placeholder. Can be enhanced with GeoIP lookup
        """
        if not ip_address:
            return "Unknown Location"
        
        # Common local IPs
        if ip_address in ['127.0.0.1', '::1', 'localhost']:
            return "Local Device"
        
        # For production, integrate with a GeoIP service
        # For now, return generic location
        return "Remote Location"
    
    def _format_last_active(self, last_activity):
        """
        Format last activity time in a human-readable way
        """
        if not last_activity:
            return "Unknown"
        
        now = timezone.now()
        diff = now - last_activity
        
        if diff.total_seconds() < 60:
            return "Just now"
        elif diff.total_seconds() < 3600:
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(diff.total_seconds() / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"


class UserSessionDetailView(APIView):
    """
    Manage individual user sessions
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, session_id):
        """
        End a specific session
        """
        try:
            logger.info(f"Ending session {session_id} for user: {request.user.email}")
            
            # Find the session
            try:
                session = UserSession.objects.get(
                    session_id=session_id,
                    user=request.user
                )
            except UserSession.DoesNotExist:
                return Response(
                    {"error": "Session not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if it's the current session
            current_session_id = None
            if hasattr(request, 'session_obj') and request.session_obj:
                current_session_id = str(request.session_obj.session_id)
            
            if str(session.session_id) == current_session_id:
                return Response(
                    {"error": "Cannot end current session. Please log out instead."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Log session end event
            SessionEvent.objects.create(
                session=session,
                event_type='logout',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                metadata={'ended_by': 'user_action', 'from_session': current_session_id}
            )
            
            # End the session
            session.is_active = False
            session.invalidated_at = timezone.now()
            session.save(update_fields=['is_active', 'invalidated_at'])
            
            logger.info(f"Successfully ended session {session_id}")
            
            return Response({
                "message": "Session ended successfully",
                "session_id": str(session_id)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error ending session: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to end session"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserLoginHistoryView(APIView):
    """
    Get user's login history
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get login history for the current user
        """
        try:
            # Get login events from the last 30 days
            thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
            
            login_events = SessionEvent.objects.filter(
                session__user=request.user,
                event_type='login',
                created_at__gte=thirty_days_ago
            ).order_by('-created_at')[:50]  # Limit to last 50 logins
            
            history = []
            for event in login_events:
                # Parse user agent
                ua_string = event.user_agent or "Unknown"
                user_agent = user_agents.parse(ua_string)
                
                history_entry = {
                    "id": str(event.id),
                    "timestamp": event.created_at.isoformat(),
                    "ip_address": event.ip_address,
                    "location": self._get_location_from_ip(event.ip_address),
                    "browser": f"{user_agent.browser.family}" if user_agent.browser.family else "Unknown",
                    "os": f"{user_agent.os.family}" if user_agent.os.family else "Unknown",
                    "success": event.metadata.get('success', True) if event.metadata else True,
                }
                
                history.append(history_entry)
            
            return Response({
                "history": history,
                "total": len(history)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching login history: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch login history"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_location_from_ip(self, ip_address):
        """
        Get approximate location from IP address
        """
        if not ip_address:
            return "Unknown Location"
        
        if ip_address in ['127.0.0.1', '::1', 'localhost']:
            return "Local Device"
        
        return "Remote Location"