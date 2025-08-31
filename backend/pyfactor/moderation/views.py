"""
Chat Moderation Views
Handles reporting, blocking, and email notifications for chat safety
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.utils import timezone
import resend
import anthropic

logger = logging.getLogger(__name__)

# Initialize Resend with API key
resend.api_key = settings.RESEND_API_KEY

# Initialize Claude client for content review
claude_client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

@csrf_exempt
@require_http_methods(["POST"])
def report_chat_message(request):
    """
    Report a chat message for moderation
    Sends email notification to support team
    """
    try:
        data = json.loads(request.body)
        
        # Extract report details
        message_id = data.get('messageId')
        message_text = data.get('messageText', '')
        sender_id = data.get('senderId')
        sender_type = data.get('senderType')
        recipient_id = data.get('recipientId')
        recipient_type = data.get('recipientType')
        reported_by = data.get('reportedBy')
        reporter_type = data.get('reporterType')
        reason = data.get('reason')
        business_name = data.get('businessName', 'Unknown Business')
        customer_name = data.get('customerName', 'Unknown Customer')
        
        # Use Claude to analyze the message severity
        severity_analysis = analyze_message_severity(message_text)
        
        # Determine email priority based on severity
        priority = "URGENT" if severity_analysis['severity'] >= 3 else "NORMAL"
        
        # Prepare email content
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">[{priority}] Chat Abuse Report</h2>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Report ID:</strong> {message_id}</p>
                <p><strong>Reported at:</strong> {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                <p><strong>Reason:</strong> {reason}</p>
                <p><strong>Reported by:</strong> {reporter_type.title()}</p>
            </div>
            
            <h3>Participants</h3>
            <ul>
                <li><strong>Business:</strong> {business_name} (ID: {recipient_id if sender_type == 'consumer' else sender_id})</li>
                <li><strong>Customer:</strong> {customer_name} (ID: {sender_id if sender_type == 'consumer' else recipient_id})</li>
            </ul>
            
            <h3>Message Content</h3>
            <div style="background: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <p>{message_text}</p>
            </div>
            
            <h3>AI Analysis</h3>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
                <p><strong>Severity Level:</strong> {severity_analysis['severity']}/4</p>
                <p><strong>Categories Detected:</strong> {', '.join(severity_analysis['categories'])}</p>
                <p><strong>AI Recommendation:</strong> {severity_analysis['recommendation']}</p>
            </div>
            
            <h3>Required Actions</h3>
            <ol>
                <li>Review the full conversation history</li>
                <li>Contact both parties if necessary</li>
                <li>Apply appropriate sanctions based on severity</li>
                <li>Update moderation logs</li>
                <li>Respond to reporter within 24 hours</li>
            </ol>
            
            <div style="margin-top: 30px; padding: 15px; background: #e5e7eb; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    This is an automated report from the Dott Apps chat moderation system.
                    <br>Please handle with appropriate urgency based on severity level.
                </p>
            </div>
        </div>
        """
        
        # Send email via Resend
        try:
            response = resend.Emails.send({
                "from": "Dott Moderation <moderation@dottapps.com>",
                "to": ["support@dottapps.com"],
                "subject": f"[{priority}] Chat Report - {reason}",
                "html": email_html,
                "reply_to": "no-reply@dottapps.com",
                "tags": [
                    {"name": "category", "value": "moderation"},
                    {"name": "severity", "value": str(severity_analysis['severity'])},
                    {"name": "type", "value": "chat_report"}
                ]
            })
            
            logger.info(f"Moderation email sent successfully: {response}")
            
        except Exception as email_error:
            logger.error(f"Failed to send moderation email: {email_error}")
            # Continue processing even if email fails
        
        # Store report in database (you would implement this)
        # report = ChatReport.objects.create(...)
        
        return JsonResponse({
            'success': True,
            'message': 'Report submitted successfully',
            'reportId': message_id,
            'severity': severity_analysis['severity']
        })
        
    except Exception as e:
        logger.error(f"Error processing chat report: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to submit report'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def block_user(request):
    """
    Block a user from messaging
    """
    try:
        data = json.loads(request.body)
        
        blocker_id = data.get('blockerId')
        blocker_type = data.get('blockerType')
        blocked_id = data.get('blockedId')
        blocked_type = data.get('blockedType')
        reason = data.get('reason')
        
        # Store block in database (you would implement this)
        # BlockedUser.objects.create(...)
        
        # Send notification email to support
        email_html = f"""
        <div style="font-family: Arial, sans-serif;">
            <h3>User Block Notification</h3>
            <p>A {blocker_type} has blocked a {blocked_type}.</p>
            <ul>
                <li>Blocker ID: {blocker_id}</li>
                <li>Blocked ID: {blocked_id}</li>
                <li>Reason: {reason}</li>
                <li>Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
            </ul>
            <p>This may indicate a problematic interaction that needs review.</p>
        </div>
        """
        
        try:
            resend.Emails.send({
                "from": "Dott Moderation <moderation@dottapps.com>",
                "to": ["support@dottapps.com"],
                "subject": f"User Block Alert - {blocker_type} blocked {blocked_type}",
                "html": email_html
            })
        except Exception as email_error:
            logger.error(f"Failed to send block notification: {email_error}")
        
        return JsonResponse({
            'success': True,
            'message': 'User blocked successfully'
        })
        
    except Exception as e:
        logger.error(f"Error processing block request: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to block user'
        }, status=500)

def analyze_message_severity(message_text):
    """
    Use Claude API to analyze message severity
    """
    try:
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=200,
            temperature=0,
            messages=[{
                "role": "user",
                "content": f"""Analyze this message for inappropriate content and rate its severity.

Message: "{message_text}"

Respond in JSON format:
{{
    "severity": <1-4 where 1=minor, 2=moderate, 3=severe, 4=critical>,
    "categories": [list of detected issues like "profanity", "harassment", "threat", etc],
    "recommendation": "brief action recommendation"
}}

Only flag actual problematic content. Normal business disagreements are severity 1."""
            }]
        )
        
        # Parse Claude's response
        import json
        analysis = json.loads(response.content[0].text)
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing message with Claude: {e}")
        # Fallback to basic analysis
        return {
            "severity": 2,
            "categories": ["requires_review"],
            "recommendation": "Manual review recommended"
        }

@csrf_exempt  
@require_http_methods(["GET"])
def get_moderation_stats(request):
    """
    Get moderation statistics for admin dashboard
    """
    try:
        # You would get these from your database
        stats = {
            'totalReports': 0,
            'pendingReview': 0,
            'resolved': 0,
            'blockedUsers': 0,
            'last24Hours': 0
        }
        
        return JsonResponse({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Error getting moderation stats: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to get statistics'
        }, status=500)