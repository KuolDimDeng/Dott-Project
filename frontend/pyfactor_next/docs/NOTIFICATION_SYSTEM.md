# Notification System Documentation

## Overview
The Dott notification system provides real-time, targeted notifications to users with comprehensive admin controls, tenant isolation, and a 90-day retention policy. The system includes a bell icon with unread count, dropdown preview, full history page, and admin management portal.

## Architecture

### Frontend Components
1. **Bell Icon (DashAppBar)** - Shows unread count badge
2. **NotificationDropdown** - Quick preview of recent notifications
3. **Notifications Page** - Full history with filtering and search
4. **Admin Portal** - Notification management interface

### Backend Components
1. **Django Models** - AdminUser, Notification, NotificationRecipient
2. **API Endpoints** - User and admin notification routes
3. **Management Commands** - Automated cleanup for 90-day retention
4. **Audit Logging** - Complete tracking for compliance

### Real-time Updates
- Polling every 30 seconds via `useNotifications` hook
- Toast notifications for new messages
- Automatic unread count updates

## User Features

### Bell Icon Notifications
- **Location**: Top right of dashboard header
- **Badge**: Shows unread count (99+ for >99)
- **Click**: Opens dropdown with recent notifications
- **Auto-refresh**: Every 30 seconds

### Notification Dropdown
- Shows up to 10 most recent notifications
- Visual indicators:
  - Blue dot for unread
  - Priority icons (🔴 high, 🟡 medium, 🟢 low)
  - Category badges
- Quick actions:
  - Mark as read
  - Mark all as read
  - View all notifications

### Notifications Page (`/dashboard/notifications`)
- **90-day history** - Older notifications automatically removed
- **Filtering Options**:
  - Category (announcements, updates, alerts, tax, payments, etc.)
  - Priority (high, medium, low)
  - Status (all, unread only, read only)
- **Search** - Find notifications by title or message content
- **Pagination** - Load more button for smooth browsing
- **Actions** - Mark individual notifications as read
- **Time Display** - Shows "2 hours ago" style timestamps

## Admin Features

### Admin Portal (`/admin`)
Access the admin portal to manage notifications and view tax feedback.

#### Authentication
- Secure JWT-based login
- IP whitelisting per admin user
- Account lockout after 5 failed attempts
- Comprehensive audit logging

#### Admin Dashboard
- Overview statistics
- Recent notifications sent
- Engagement metrics (read rates)
- Tax feedback management

#### Creating Notifications

1. **Navigate to Notifications section**
2. **Click "Create New Notification"**
3. **Fill in details**:
   - Title (required)
   - Message (required)
   - Priority (high/medium/low)
   - Category (optional)
   - Icon type
   - Action button (optional)

4. **Select Target Audience**:
   - **All Users** - Send to everyone
   - **Specific Users** - By email addresses
   - **By Subscription Plan** - Free, Professional, Enterprise
   - **By Role** - Owner, Admin, User
   - **By Country** - Geographic targeting
   - **Active Users** - Users active in last X days

5. **Additional Options**:
   - Schedule for later
   - Set expiration date
   - Send email copy
   - Auto-dismiss timer

6. **Send Notification**
   - Review recipient count
   - Click "Send Now"
   - Monitor delivery status

#### Tax Feedback Management
- View user-reported tax inaccuracies
- Filter by status, country, type
- Update status and add resolution notes
- Track AI confidence scores

## API Endpoints

### User Endpoints
```
GET  /api/notifications/user              # Get user notifications
POST /api/notifications/user/{id}/mark-read  # Mark as read
POST /api/notifications/user/mark-all-read   # Mark all as read
```

### Admin Endpoints
```
POST /api/admin/login                     # Admin authentication
GET  /api/admin/dashboard                 # Dashboard stats
GET  /api/admin/feedback                  # Tax feedback list
PATCH /api/admin/feedback/{id}            # Update feedback
GET  /api/admin/notifications             # List notifications
POST /api/admin/notifications             # Create notification
POST /api/admin/notifications/{id}/send   # Send notification
GET  /api/admin/templates                 # Notification templates
```

## Database Schema

### Notification Model
```python
- id (UUID)
- title (CharField)
- message (TextField)
- icon_type (CharField)
- category (CharField)
- priority (CharField)
- status (CharField)
- target_type (CharField)
- target_criteria (JSONField)
- total_recipients (IntegerField)
- read_count (IntegerField)
- created_at (DateTimeField)
- expires_at (DateTimeField)
```

### NotificationRecipient Model
```python
- id (UUID)
- notification (ForeignKey)
- tenant_id (UUIDField)
- user_email (EmailField)
- is_read (BooleanField)
- read_at (DateTimeField)
- delivered_at (DateTimeField)
```

## Maintenance

### Automatic Cleanup (90-day retention)
Set up a daily cron job:
```bash
# Add to crontab
0 2 * * * cd /path/to/project && python manage.py cleanup_old_notifications
```

Manual cleanup options:
```bash
# Dry run to preview
python manage.py cleanup_old_notifications --dry-run

# Custom retention period
python manage.py cleanup_old_notifications --days=60

# Batch size control
python manage.py cleanup_old_notifications --batch-size=500
```

### Monitoring
- Check notification delivery rates in admin dashboard
- Monitor read rates for engagement
- Review audit logs for security
- Track cleanup job success

## Security Features

### Tenant Isolation
- All notifications filtered by tenant_id
- Backend enforces tenant boundaries
- No cross-tenant data leakage

### Admin Security
- JWT authentication tokens
- IP whitelisting per admin
- Failed login protection
- Comprehensive audit trail
- Role-based permissions

### Data Protection
- 90-day automatic deletion
- Encrypted session storage
- HTTPS-only transmission
- CSRF protection

## Configuration

### Environment Variables
```bash
# Backend
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_M2M_CLIENT_ID=your-m2m-client-id
AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret

# Frontend
NEXT_PUBLIC_BACKEND_URL=https://api.dottapps.com
```

### Django Settings
Add to INSTALLED_APPS:
```python
INSTALLED_APPS = [
    ...
    'notifications',
]
```

### URL Configuration
```python
urlpatterns = [
    ...
    path('api/notifications/', include('notifications.urls')),
]
```

## Troubleshooting

### Notifications Not Appearing
1. Check browser console for errors
2. Verify user has tenant_id
3. Ensure notification was sent to correct target
4. Check 90-day retention hasn't expired notification

### Bell Icon Not Updating
1. Check useNotifications hook is polling
2. Verify API endpoints are accessible
3. Check for JavaScript errors
4. Ensure session is authenticated

### Admin Portal Issues
1. Verify admin user exists and is active
2. Check IP is whitelisted for admin
3. Review audit logs for failed attempts
4. Ensure correct JWT token handling

## Best Practices

### Creating Effective Notifications
1. **Clear Titles** - Summarize the message
2. **Concise Messages** - Get to the point quickly
3. **Appropriate Priority** - Don't overuse high priority
4. **Relevant Categories** - Help users filter
5. **Action Buttons** - Include when action needed
6. **Timely Delivery** - Send when users are active

### Targeting Guidelines
1. **Be Specific** - Target relevant user segments
2. **Avoid Spam** - Don't over-notify
3. **Test First** - Send to small group initially
4. **Monitor Engagement** - Track read rates
5. **Iterate** - Improve based on metrics

## Future Enhancements
- WebSocket real-time delivery
- Push notifications support
- Email template designer
- A/B testing for messages
- Advanced analytics dashboard
- Notification preferences per user
- Scheduled recurring notifications
- Integration with third-party services