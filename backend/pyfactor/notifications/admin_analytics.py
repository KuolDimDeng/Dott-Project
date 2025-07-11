"""
Admin analytics views
"""
from datetime import datetime, timedelta
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from custom_auth.models import User, Tenant
from users.models import Subscription, Business
from notifications.models import Notification, NotificationRecipient
from notifications.admin_views import EnhancedAdminPermission


class AdminAnalyticsView(APIView):
    """
    Admin analytics dashboard data
    """
    permission_classes = [EnhancedAdminPermission]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Revenue Analytics
        revenue_data = self._get_revenue_analytics(start_date, end_date)
        
        # User Analytics
        user_data = self._get_user_analytics(start_date, end_date)
        
        # Document Analytics (placeholder for now)
        document_data = self._get_document_analytics(start_date, end_date)
        
        # Geographic Analytics
        geographic_data = self._get_geographic_analytics()
        
        # Subscription Analytics
        subscription_data = self._get_subscription_analytics()
        
        # KPIs
        kpis = self._calculate_kpis(start_date, end_date)
        
        return Response({
            'revenue': revenue_data,
            'users': user_data,
            'documents': document_data,
            'geographic': geographic_data,
            'subscriptions': subscription_data,
            'kpis': kpis,
        })
    
    def _get_revenue_analytics(self, start_date, end_date):
        """Calculate revenue metrics"""
        # Get active subscriptions in the period
        active_subs = Subscription.objects.filter(
            status='active',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related('business')
        
        # Base pricing (from CLAUDE.md)
        pricing = {
            'free': 0,
            'professional': 15,
            'enterprise': 45
        }
        
        total_revenue = 0
        for sub in active_subs:
            # Get the base price
            base_price = pricing.get(sub.selected_plan, 0)
            
            # Check for developing country discount
            if sub.business:
                from users.discount_models import DevelopingCountry
                # Check by country code if available
                country = getattr(sub.business, 'country', None)
                if country:
                    # Try to get discount by country name or code
                    is_developing = DevelopingCountry.objects.filter(
                        Q(country_name__iexact=country) | 
                        Q(country_code__iexact=country[:2] if len(country) >= 2 else country)
                    ).exists()
                    if is_developing:
                        base_price = base_price * 0.5  # 50% discount
            
            # Calculate based on billing cycle
            if sub.billing_cycle in ['yearly', 'annual']:
                # 20% yearly discount
                period_revenue = base_price * 12 * 0.8
            elif sub.billing_cycle == '6month':
                # 17% 6-month discount
                period_revenue = base_price * 6 * 0.83
            else:  # monthly
                period_revenue = base_price
            
            total_revenue += period_revenue
        
        # Calculate previous period for trend
        prev_start = start_date - (end_date - start_date)
        prev_end = start_date
        prev_revenue = self._calculate_period_revenue(prev_start, prev_end)
        
        trend = 0
        if prev_revenue > 0:
            trend = ((total_revenue - prev_revenue) / prev_revenue) * 100
        
        # Generate daily revenue chart data
        chart_data = []
        days_diff = (end_date - start_date).days
        interval = max(1, days_diff // 7)  # Show 7 data points
        
        # For more accurate daily data, group by date
        from django.db.models.functions import TruncDate
        daily_subs = Subscription.objects.filter(
            status='active',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Create a map of daily new subscriptions
        daily_map = {item['date']: item['count'] for item in daily_subs}
        
        for i in range(0, days_diff, interval):
            date = start_date + timedelta(days=i)
            # Estimate daily revenue based on new subscriptions that day
            new_subs = daily_map.get(date.date(), 0)
            # Assume average subscription value
            avg_sub_value = total_revenue / max(active_subs.count(), 1) if active_subs.count() > 0 else 0
            daily_revenue = new_subs * avg_sub_value
            
            chart_data.append({
                'label': date.strftime('%m/%d'),
                'value': round(daily_revenue, 2)
            })
        
        return {
            'total': round(total_revenue, 2),
            'trend': round(trend, 1),
            'chart_data': chart_data
        }
    
    def _get_user_analytics(self, start_date, end_date):
        """Calculate user metrics"""
        # Total active users
        active_users = User.objects.filter(
            is_active=True,
            last_login__gte=start_date
        ).count()
        
        # New users in period
        new_users = User.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()
        
        # Previous period comparison
        prev_start = start_date - (end_date - start_date)
        prev_end = start_date
        prev_active = User.objects.filter(
            is_active=True,
            last_login__gte=prev_start,
            last_login__lt=prev_end
        ).count()
        
        trend = 0
        if prev_active > 0:
            trend = ((active_users - prev_active) / prev_active) * 100
        
        # Generate chart data
        chart_data = []
        days_diff = (end_date - start_date).days
        interval = max(1, days_diff // 7)
        
        for i in range(0, days_diff, interval):
            date = start_date + timedelta(days=i)
            day_users = User.objects.filter(
                created_at__date=date.date()
            ).count()
            chart_data.append({
                'label': date.strftime('%m/%d'),
                'value': day_users
            })
        
        return {
            'active': active_users,
            'new': new_users,
            'trend': trend,
            'chart_data': chart_data
        }
    
    def _get_document_analytics(self, start_date, end_date):
        """Calculate document metrics"""
        # Try to get document stats from various models
        total_documents = 0
        
        try:
            # Count invoices
            from invoicing.models import Invoice
            invoice_count = Invoice.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            total_documents += invoice_count
        except:
            pass
        
        try:
            # Count receipts
            from receipts.models import Receipt
            receipt_count = Receipt.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            total_documents += receipt_count
        except:
            pass
        
        try:
            # Count expense documents
            from expenses.models import Expense
            expense_count = Expense.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
            total_documents += expense_count
        except:
            pass
        
        # Calculate trend
        prev_start = start_date - (end_date - start_date)
        prev_end = start_date
        prev_total = 0
        
        # Simplified trend calculation
        trend = 0
        if prev_total > 0:
            trend = ((total_documents - prev_total) / prev_total) * 100
        elif total_documents > 0:
            trend = 100  # All new growth
        
        return {
            'total': total_documents,
            'trend': round(trend, 1),
            'chart_data': []  # Can be expanded later
        }
    
    def _get_geographic_analytics(self):
        """Get geographic distribution"""
        countries = User.objects.exclude(
            country__isnull=True
        ).exclude(
            country=''
        ).values('country').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Country flag mapping (simplified)
        flag_map = {
            'United States': '🇺🇸',
            'Canada': '🇨🇦',
            'United Kingdom': '🇬🇧',
            'Kenya': '🇰🇪',
            'Nigeria': '🇳🇬',
            'South Africa': '🇿🇦',
            'India': '🇮🇳',
            'Australia': '🇦🇺',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
        }
        
        top_countries = []
        for country in countries[:5]:
            top_countries.append({
                'code': country['country'][:2].upper(),
                'name': country['country'],
                'flag': flag_map.get(country['country'], '🌍'),
                'users': country['count']
            })
        
        return {
            'countries_count': countries.count(),
            'top_countries': top_countries,
            'new_countries': 2  # Placeholder
        }
    
    def _get_subscription_analytics(self):
        """Get subscription distribution"""
        # Get active subscriptions
        active_subs = Subscription.objects.filter(status='active')
        total_subs = active_subs.count()
        
        # Count by plan
        free_count = active_subs.filter(selected_plan='free').count()
        pro_count = active_subs.filter(selected_plan='professional').count()
        ent_count = active_subs.filter(selected_plan='enterprise').count()
        
        # Also count businesses without subscriptions as free
        businesses_with_subs = active_subs.values_list('business_id', flat=True)
        free_businesses = Business.objects.exclude(
            id__in=businesses_with_subs
        ).filter(is_active=True).count()
        free_count += free_businesses
        
        total_businesses = free_count + pro_count + ent_count
        
        plan_dist = {
            'Basic': {
                'count': free_count,
                'percentage': round((free_count / max(total_businesses, 1)) * 100, 1)
            },
            'Professional': {
                'count': pro_count,
                'percentage': round((pro_count / max(total_businesses, 1)) * 100, 1)
            },
            'Enterprise': {
                'count': ent_count,
                'percentage': round((ent_count / max(total_businesses, 1)) * 100, 1)
            }
        }
        
        return {
            'total': total_subs,
            'total_businesses': total_businesses,
            'plan_distribution': plan_dist
        }
    
    def _calculate_kpis(self, start_date, end_date):
        """Calculate key performance indicators"""
        total_users = User.objects.filter(is_active=True).count()
        total_revenue = self._calculate_period_revenue(start_date, end_date)
        
        # ARPU (Average Revenue Per User)
        arpu = total_revenue / max(total_users, 1)
        
        # Churn rate
        churned = Subscription.objects.filter(
            status='cancelled',
            updated_at__gte=start_date,  # Use updated_at since cancelled_at might not exist
            updated_at__lte=end_date
        ).count()
        total_subs = Subscription.objects.filter(
            created_at__lte=end_date
        ).count()
        churn_rate = (churned / max(total_subs, 1)) * 100 if total_subs > 0 else 0
        
        # Conversion rate (users with paid subscriptions)
        # Get businesses with paid subscriptions
        paid_businesses = Subscription.objects.filter(
            status='active'
        ).exclude(
            selected_plan='free'
        ).values('business_id').distinct().count()
        
        # Get total businesses
        total_businesses = Business.objects.filter(is_active=True).count()
        conversion_rate = (paid_businesses / max(total_businesses, 1)) * 100 if total_businesses > 0 else 0
        
        # Support tickets (from tax feedback)
        try:
            from tax_management.models import TaxFilingFeedback
            support_tickets = TaxFilingFeedback.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
        except:
            # If tax feedback model doesn't exist, use notifications as proxy
            support_tickets = NotificationRecipient.objects.filter(
                notification__notification_type='support',
                created_at__gte=start_date,
                created_at__lte=end_date
            ).count()
        
        return {
            'arpu': round(arpu, 2),
            'churn_rate': round(churn_rate, 1),
            'conversion_rate': round(conversion_rate, 1),
            'support_tickets': support_tickets
        }
    
    def _calculate_period_revenue(self, start_date, end_date):
        """Helper to calculate revenue for a period"""
        active_subs = Subscription.objects.filter(
            status='active',
            created_at__gte=start_date,
            created_at__lte=end_date
        ).select_related('business')
        
        # Use lowercase keys to match the model field values
        pricing = {
            'free': 0,
            'professional': 15,
            'enterprise': 45
        }
        
        total = 0
        for sub in active_subs:
            # Get base price from selected_plan field
            base_price = pricing.get(sub.selected_plan, 0)
            
            # Check for developing country discount
            if sub.business:
                from users.discount_models import DevelopingCountry
                country = getattr(sub.business, 'country', None)
                if country:
                    is_developing = DevelopingCountry.objects.filter(
                        Q(country_name__iexact=country) | 
                        Q(country_code__iexact=country[:2] if len(country) >= 2 else country)
                    ).exists()
                    if is_developing:
                        base_price = base_price * 0.5
            
            # Apply billing cycle discounts
            if sub.billing_cycle in ['yearly', 'annual']:
                total += base_price * 12 * 0.8
            elif sub.billing_cycle == '6month':
                total += base_price * 6 * 0.83
            else:
                total += base_price
                
        return total