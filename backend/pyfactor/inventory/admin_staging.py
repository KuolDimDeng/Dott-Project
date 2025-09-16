"""
Django Admin interface for product staging and moderation
Available at dottapps.com/admin
"""
from django.contrib import admin
from django.utils.html import mark_safe, format_html
from django.utils import timezone
from django.db.models import Count, Avg, Q
from django.contrib import messages
from django.urls import reverse
from django.http import HttpResponseRedirect
from .models_staging import StoreItemStaging, StageSubmission, FlaggedImage, ModeratorAction
from .models_storeitems import StoreItem
import json


class StageSubmissionInline(admin.TabularInline):
    """Show all submissions for a staging item"""
    model = StageSubmission
    extra = 0
    readonly_fields = ('user', 'business_name', 'submitted_name', 'submitted_brand',
                      'submitted_price', 'submitted_at', 'ip_address')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(StoreItemStaging)
class StoreItemStagingAdmin(admin.ModelAdmin):
    """
    Main admin interface for moderating product submissions
    Access at: dottapps.com/admin/inventory/storeitemstaging/
    """

    list_display = [
        'thumbnail_preview',
        'barcode',
        'name',
        'brand',
        'category',
        'submission_count',
        'confidence_score_display',
        'status_badge',
        'submitted_by_business_name',
        'submission_date',
        'quick_actions',
    ]

    list_filter = [
        'status',
        'image_is_safe',
        ('submission_date', admin.DateFieldListFilter),
        ('confidence_score', admin.AllValuesFieldListFilter),
        'category',
        'brand',
    ]

    search_fields = [
        'barcode',
        'name',
        'brand',
        'submitted_by_business_name',
        'description',
    ]

    readonly_fields = [
        'id',
        'submission_count',
        'confidence_score',
        'data_consistency_score',
        'image_moderation_scores_display',
        'submitted_by',
        'submission_date',
        'review_info',
        'auto_approval_status',
        'all_submissions_display',
    ]

    fieldsets = (
        ('Product Information', {
            'fields': (
                'barcode',
                'name',
                'brand',
                'category',
                'size',
                'unit',
                'description',
            )
        }),
        ('Images', {
            'fields': (
                'image_preview_large',
                'image_url',
                'thumbnail_url',
                'image_is_safe',
                'image_moderation_scores_display',
            )
        }),
        ('Submission Details', {
            'fields': (
                'submitted_by',
                'submitted_by_business_name',
                'submission_date',
                'submission_count',
                'all_submissions_display',
            )
        }),
        ('Confidence & Auto-Approval', {
            'fields': (
                'confidence_score',
                'data_consistency_score',
                'auto_approval_status',
            ),
            'classes': ('collapse',),
        }),
        ('Review', {
            'fields': (
                'status',
                'review_notes',
                'rejection_reason',
                'review_info',
            )
        }),
    )

    actions = [
        'approve_items',
        'reject_items',
        'flag_for_review',
        'recalculate_confidence',
        'bulk_auto_approve',
    ]

    inlines = [StageSubmissionInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Annotate with submission count for efficiency
        qs = qs.annotate(
            total_submissions=Count('submissions')
        )
        # Show high confidence items first when filtering by pending
        if request.GET.get('status__exact') == 'pending':
            qs = qs.order_by('-confidence_score', '-submission_count', '-submission_date')
        return qs

    def thumbnail_preview(self, obj):
        """Show product image thumbnail with blur for safety"""
        if obj.thumbnail_url or obj.image_url:
            url = obj.thumbnail_url or obj.image_url
            # Blur if not safe
            style = 'filter: blur(8px);' if not obj.image_is_safe else ''
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit: cover; {}" '
                'onclick="if(confirm(\'View full size?\')) window.open(\'{}\', \'_blank\')" '
                'style="cursor: pointer;" title="Click to view full size"/>',
                url, style, url
            )
        return '-'
    thumbnail_preview.short_description = 'Image'

    def image_preview_large(self, obj):
        """Large image preview for detail view"""
        if obj.image_url:
            style = 'filter: blur(10px);' if not obj.image_is_safe else ''
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 300px; {}" />',
                obj.image_url, style
            )
        return 'No image'
    image_preview_large.short_description = 'Image Preview'

    def confidence_score_display(self, obj):
        """Color-coded confidence score"""
        score = float(obj.confidence_score)
        if score >= 0.8:
            color = 'green'
            icon = '✅'
        elif score >= 0.5:
            color = 'orange'
            icon = '⚠️'
        else:
            color = 'red'
            icon = '❌'

        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {:.0%}</span>',
            color, icon, score
        )
    confidence_score_display.short_description = 'Confidence'
    confidence_score_display.admin_order_field = 'confidence_score'

    def status_badge(self, obj):
        """Status with color coding"""
        colors = {
            'pending': '#FFA500',
            'approved': '#28a745',
            'auto_approved': '#17a2b8',
            'rejected': '#dc3545',
            'flagged': '#ffc107',
            'duplicate': '#6c757d',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px; font-weight: bold;">{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def quick_actions(self, obj):
        """Quick approve/reject buttons"""
        if obj.status == 'pending':
            return format_html(
                '<a class="button" href="{}" style="background: #28a745; color: white; padding: 3px 8px; '
                'margin-right: 5px;" onclick="return confirm(\'Approve this item?\')">✓ Approve</a>'
                '<a class="button" href="{}" style="background: #dc3545; color: white; padding: 3px 8px;"'
                ' onclick="return confirm(\'Reject this item?\')">✗ Reject</a>',
                reverse('admin:quick_approve_staging', args=[obj.pk]),
                reverse('admin:quick_reject_staging', args=[obj.pk])
            )
        return '-'
    quick_actions.short_description = 'Actions'

    def review_info(self, obj):
        """Display review information"""
        if obj.reviewed_by:
            return format_html(
                'Reviewed by: {}<br>Date: {}<br>Notes: {}',
                obj.reviewed_by,
                obj.review_date,
                obj.review_notes or '-'
            )
        return 'Not reviewed'
    review_info.short_description = 'Review Information'

    def auto_approval_status(self, obj):
        """Check if item can be auto-approved"""
        can_approve, reason = obj.can_auto_approve()
        if can_approve:
            return format_html(
                '<span style="color: green;">✅ {}</span>',
                reason
            )
        else:
            return format_html(
                '<span style="color: red;">❌ {}</span>',
                reason
            )
    auto_approval_status.short_description = 'Auto-Approval Eligibility'

    def all_submissions_display(self, obj):
        """Show all businesses that submitted this item"""
        submissions = obj.submissions.all()
        if submissions:
            html = '<ul style="margin: 0; padding-left: 20px;">'
            for sub in submissions[:5]:  # Show first 5
                html += f'<li>{sub.business_name} - {sub.submitted_name} - {sub.submitted_at.strftime("%Y-%m-%d %H:%M")}</li>'
            if submissions.count() > 5:
                html += f'<li><i>... and {submissions.count() - 5} more</i></li>'
            html += '</ul>'
            return format_html(html)
        return 'No submissions'
    all_submissions_display.short_description = 'All Submissions'

    def image_moderation_scores_display(self, obj):
        """Display AI moderation scores"""
        if obj.image_moderation_scores:
            html = '<ul style="margin: 0; padding-left: 20px;">'
            for key, value in obj.image_moderation_scores.items():
                html += f'<li>{key}: {value}</li>'
            html += '</ul>'
            return format_html(html)
        return 'No moderation data'
    image_moderation_scores_display.short_description = 'AI Moderation Scores'

    # Admin Actions
    def approve_items(self, request, queryset):
        """Bulk approve selected items"""
        approved_count = 0
        for item in queryset.filter(status='pending'):
            try:
                store_item = item.approve(user=request.user)
                approved_count += 1

                # Log moderator action
                ModeratorAction.objects.create(
                    moderator=request.user,
                    action='approve',
                    staging_item=item,
                    reason=f'Bulk approval via admin'
                )
            except Exception as e:
                messages.error(request, f"Error approving {item.barcode}: {str(e)}")

        messages.success(request, f"Successfully approved {approved_count} items")
    approve_items.short_description = "✅ Approve selected items"

    def reject_items(self, request, queryset):
        """Bulk reject selected items"""
        rejected_count = 0
        for item in queryset.filter(status='pending'):
            item.status = 'rejected'
            item.reviewed_by = request.user
            item.review_date = timezone.now()
            item.rejection_reason = 'Bulk rejection via admin'
            item.save()
            rejected_count += 1

            # Log moderator action
            ModeratorAction.objects.create(
                moderator=request.user,
                action='reject',
                staging_item=item,
                reason='Bulk rejection via admin'
            )

        messages.success(request, f"Rejected {rejected_count} items")
    reject_items.short_description = "❌ Reject selected items"

    def flag_for_review(self, request, queryset):
        """Flag items for manual review"""
        flagged_count = queryset.update(status='flagged')
        messages.warning(request, f"Flagged {flagged_count} items for review")
    flag_for_review.short_description = "🚩 Flag for manual review"

    def recalculate_confidence(self, request, queryset):
        """Recalculate confidence scores"""
        for item in queryset:
            item.calculate_confidence_score()
            item.save()
        messages.info(request, f"Recalculated confidence for {queryset.count()} items")
    recalculate_confidence.short_description = "🔄 Recalculate confidence scores"

    def bulk_auto_approve(self, request, queryset):
        """Auto-approve eligible items"""
        approved_count = 0
        for item in queryset.filter(status='pending'):
            can_approve, reason = item.can_auto_approve()
            if can_approve:
                item.approve(user=request.user, auto=True)
                approved_count += 1

                ModeratorAction.objects.create(
                    moderator=request.user,
                    action='approve',
                    staging_item=item,
                    reason=f'Auto-approval: {reason}'
                )

        messages.success(request, f"Auto-approved {approved_count} eligible items")
    bulk_auto_approve.short_description = "🤖 Auto-approve eligible items"

    def get_urls(self):
        """Add custom URLs for quick actions"""
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('quick-approve/<uuid:pk>/', self.quick_approve, name='quick_approve_staging'),
            path('quick-reject/<uuid:pk>/', self.quick_reject, name='quick_reject_staging'),
        ]
        return custom_urls + urls

    def quick_approve(self, request, pk):
        """Quick approve action"""
        item = StoreItemStaging.objects.get(pk=pk)
        item.approve(user=request.user)

        ModeratorAction.objects.create(
            moderator=request.user,
            action='approve',
            staging_item=item,
            reason='Quick approval via admin'
        )

        messages.success(request, f"Approved {item.name}")
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/inventory/storeitemstaging/'))

    def quick_reject(self, request, pk):
        """Quick reject action"""
        item = StoreItemStaging.objects.get(pk=pk)
        item.status = 'rejected'
        item.reviewed_by = request.user
        item.review_date = timezone.now()
        item.save()

        ModeratorAction.objects.create(
            moderator=request.user,
            action='reject',
            staging_item=item,
            reason='Quick rejection via admin'
        )

        messages.warning(request, f"Rejected {item.name}")
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/inventory/storeitemstaging/'))


@admin.register(FlaggedImage)
class FlaggedImageAdmin(admin.ModelAdmin):
    """Admin interface for reviewing flagged images"""
    list_display = ['thumbnail', 'product_barcode', 'reason', 'uploaded_by', 'uploaded_at', 'reviewed']
    list_filter = ['reason', 'reviewed', 'flagged_by_ai', 'uploaded_at']
    search_fields = ['product_barcode', 'uploaded_by__username']
    readonly_fields = ['image_hash', 'ai_moderation_scores', 'uploaded_at']

    def thumbnail(self, obj):
        """Show blurred thumbnail for safety"""
        return format_html(
            '<img src="{}" width="50" height="50" style="filter: blur(8px); object-fit: cover;" '
            'title="Flagged image - click to review" />',
            obj.image_url
        )
    thumbnail.short_description = 'Image'

    actions = ['mark_reviewed', 'ban_uploaders']

    def mark_reviewed(self, request, queryset):
        """Mark images as reviewed"""
        queryset.update(
            reviewed=True,
            reviewed_by=request.user,
            review_date=timezone.now()
        )
        messages.success(request, f"Marked {queryset.count()} images as reviewed")
    mark_reviewed.short_description = "✓ Mark as reviewed"

    def ban_uploaders(self, request, queryset):
        """Ban users who uploaded flagged images"""
        users = set()
        for item in queryset:
            if item.uploaded_by:
                users.add(item.uploaded_by)

        for user in users:
            # Add logic to ban user from uploading
            ModeratorAction.objects.create(
                moderator=request.user,
                action='ban_user',
                target_user=user,
                reason='Uploaded inappropriate images'
            )

        messages.warning(request, f"Banned {len(users)} users from uploading")
    ban_uploaders.short_description = "🚫 Ban uploaders"


@admin.register(ModeratorAction)
class ModeratorActionAdmin(admin.ModelAdmin):
    """Audit log for moderator actions"""
    list_display = ['moderator', 'action', 'staging_item', 'target_user', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['moderator__username', 'reason']
    readonly_fields = ['id', 'timestamp']

    def has_add_permission(self, request):
        return False  # Don't allow manual creation

    def has_delete_permission(self, request, obj=None):
        return False  # Don't allow deletion of audit logs


# Admin site customization
admin.site.site_header = "Dott Apps Admin - Product Moderation"
admin.site.site_title = "Dott Admin"
admin.site.index_title = "Product Catalog Management"