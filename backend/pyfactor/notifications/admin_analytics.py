"""
Admin analytics views
"""
from datetime import datetime, timedelta
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from custom_auth.models import User, Tenant, Subscription
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
        # Get active subscriptions
        active_subs = Subscription.objects.filter(
            status='active',
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # Calculate total revenue (simplified - actual implementation would use Stripe data)
        plan_prices = {
            'Basic': 0,
            'Professional': 15,
            'Enterprise': 45
        }
        
        total_revenue = 0
        for sub in active_subs:
            plan_name = sub.plan.name if hasattr(sub, 'plan') else 'Basic'
            monthly_price = plan_prices.get(plan_name, 0)
            
            # Adjust for billing cycle
            if sub.billing_cycle == 'yearly':
                monthly_price = monthly_price * 12 * 0.8  # 20% yearly discount
            elif sub.billing_cycle == '6_months':
                monthly_price = monthly_price * 6 * 0.83  # 17% 6-month discount
                
            total_revenue += monthly_price
        
        # Calculate previous period for trend
        prev_start = start_date - (end_date - start_date)
        prev_end = start_date
        prev_revenue = self._calculate_period_revenue(prev_start, prev_end)
        
        trend = 0
        if prev_revenue > 0:
            trend = ((total_revenue - prev_revenue) / prev_revenue) * 100
        
        # Generate chart data (simplified)
        chart_data = []
        days_diff = (end_date - start_date).days
        interval = max(1, days_diff // 7)  # Show 7 data points
        
        for i in range(0, days_diff, interval):
            date = start_date + timedelta(days=i)
            daily_revenue = total_revenue / days_diff  # Simplified
            chart_data.append({
                'label': date.strftime('%m/%d'),
                'value': round(daily_revenue, 2)
            })
        
        return {
            'total': total_revenue,
            'trend': trend,
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
        """Calculate document metrics (placeholder)"""
        # This would integrate with your document system
        # For now, returning sample data
        return {
            'total': 12543,
            'trend': 15.3,
            'chart_data': []
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
        # Plan distribution
        plan_dist = {}
        total_subs = Subscription.objects.filter(status='active').count()
        
        for plan_name in ['Basic', 'Professional', 'Enterprise']:
            count = Subscription.objects.filter(
                status='active',
                plan__name=plan_name
            ).count() if total_subs > 0 else 0
            
            # For Basic plan, count users without active paid subscriptions
            if plan_name == 'Basic':
                count = User.objects.filter(
                    is_active=True
                ).exclude(
                    id__in=Subscription.objects.filter(
                        status='active'
                    ).values_list('user_id', flat=True)
                ).count()
            
            percentage = (count / max(total_subs, 1)) * 100 if total_subs > 0 else 0
            
            plan_dist[plan_name] = {
                'count': count,
                'percentage': round(percentage, 1)
            }
        
        return {
            'total': total_subs,
            'plan_distribution': plan_dist
        }
    
    def _calculate_kpis(self, start_date, end_date):
        """Calculate key performance indicators"""
        total_users = User.objects.filter(is_active=True).count()
        total_revenue = self._calculate_period_revenue(start_date, end_date)
        
        # ARPU (Average Revenue Per User)
        arpu = total_revenue / max(total_users, 1)
        
        # Churn rate (simplified)
        churned = Subscription.objects.filter(
            status='cancelled',
            cancelled_at__gte=start_date,
            cancelled_at__lte=end_date
        ).count()
        total_subs = Subscription.objects.filter(
            created_at__lte=end_date
        ).count()
        churn_rate = (churned / max(total_subs, 1)) * 100 if total_subs > 0 else 0
        
        # Conversion rate (users with paid subscriptions)
        paid_users = Subscription.objects.filter(
            status='active'
        ).exclude(
            plan__name='Basic'
        ).values('user_id').distinct().count()
        conversion_rate = (paid_users / max(total_users, 1)) * 100 if total_users > 0 else 0
        
        # Support tickets (from tax feedback as proxy)
        from tax_management.models import TaxFilingFeedback
        support_tickets = TaxFilingFeedback.objects.filter(
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
        )
        
        plan_prices = {
            'Basic': 0,
            'Professional': 15,
            'Enterprise': 45
        }
        
        total = 0
        for sub in active_subs:
            plan_name = sub.plan.name if hasattr(sub, 'plan') else 'Basic'
            price = plan_prices.get(plan_name, 0)
            
            if sub.billing_cycle == 'yearly':
                price = price * 12 * 0.8
            elif sub.billing_cycle == '6_months':
                price = price * 6 * 0.83
                
            total += price
            
        return total