from django.core.exceptions import PermissionDenied
from .models import Subscription

def restrict_users(view_func):
    def wrapper(request, *args, **kwargs):
        user = request.user
        subscription = Subscription.objects.get(user=user)
        max_users = get_max_users(subscription.subscription_type)
        
        if user.business_users.count() >= max_users:
            raise PermissionDenied("Maximum number of users reached for your subscription plan.")
        
        return view_func(request, *args, **kwargs)
    
    return wrapper

def get_max_users(subscription_type):
    if subscription_type == 'trial':
        return 1
    elif subscription_type in ['monthly_1', 'yearly_1']:
        return 1
    elif subscription_type in ['monthly_5', 'yearly_5']:
        return 5
    elif subscription_type in ['monthly_10', 'yearly_10']:
        return 10
    elif subscription_type in ['monthly_50', 'yearly_50']:
        return 50
    else:
        return 0