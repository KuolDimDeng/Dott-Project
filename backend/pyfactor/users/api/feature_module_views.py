"""
API endpoints for À La Carte Feature Module Management
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from datetime import datetime
from decimal import Decimal

from users.models import FeatureModule, BusinessFeatureModule, FeatureBillingEvent
from users.services.proration_service import ProrationService
from users.services.feature_access_service import FeatureAccessService
from users.serializers import FeatureModuleSerializer, BusinessFeatureModuleSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_features(request):
    """Get features business can add"""
    try:
        business = request.user.business
        
        # Get all active feature modules
        all_features = FeatureModule.objects.filter(is_active=True)
        
        # Get already enabled features
        enabled_modules = BusinessFeatureModule.objects.filter(
            business=business,
            enabled=True
        ).values_list('feature_module__code', flat=True)
        
        # Filter out already enabled and core features
        available = all_features.exclude(
            code__in=enabled_modules
        ).exclude(is_core=True)
        
        # Check if developing country for pricing
        is_developing = business.is_developing_country if hasattr(business, 'is_developing_country') else False
        
        # Serialize features with appropriate pricing
        features_data = []
        for feature in available:
            price = feature.developing_country_price if is_developing else feature.monthly_price
            features_data.append({
                'code': feature.code,
                'name': feature.name,
                'description': feature.description,
                'category': feature.category,
                'price': float(price),
                'required_features': feature.required_features
            })
        
        return Response({
            'success': True,
            'available_features': features_data,
            'testing_mode': ProrationService.TESTING_MODE,
            'is_test_account': request.user.email in ProrationService.TEST_ACCOUNTS
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_enabled_features(request):
    """Get currently enabled features for the business"""
    try:
        features = FeatureAccessService.get_user_features(request.user)
        
        return Response({
            'success': True,
            'features': features
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_feature_module(request):
    """Add a feature with immediate proration"""
    try:
        feature_code = request.data.get('feature_code')
        
        if not feature_code:
            return Response({
                'success': False,
                'error': 'Feature code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the feature module
        try:
            feature = FeatureModule.objects.get(code=feature_code, is_active=True)
        except FeatureModule.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Feature {feature_code} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        business = request.user.business
        
        # Check if already enabled
        if BusinessFeatureModule.objects.filter(
            business=business,
            feature_module=feature,
            enabled=True
        ).exists():
            return Response({
                'success': False,
                'error': 'Feature already enabled'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Calculate proration
            proration = ProrationService.calculate_proration(
                request.user,
                feature,
                action='add'
            )
            
            # Add feature to business
            business_feature, created = BusinessFeatureModule.objects.update_or_create(
                business=business,
                feature_module=feature,
                defaults={
                    'enabled': True,
                    'removed_at': None,
                    'next_bill_date': business.subscription.current_period_end if business.subscription else None
                }
            )
            
            # Process payment if not testing and not test account
            charge_id = None
            if proration['charge_now'] and proration['amount'] > 0:
                charge_id = ProrationService.process_stripe_charge(
                    request.user,
                    proration['amount'],
                    proration['description']
                )
                
                # Update billing event with charge ID
                if proration.get('billing_event_id'):
                    FeatureBillingEvent.objects.filter(
                        id=proration['billing_event_id']
                    ).update(
                        stripe_charge_id=charge_id,
                        charged=True if charge_id else False
                    )
            
            message = f"Added {feature.name}. "
            if proration['is_test_account']:
                message += "Test account - no charges."
            elif proration['testing_mode']:
                message += f"Would charge ${proration['amount']} (Testing Mode)"
            elif charge_id:
                message += f"Charged ${proration['amount']}"
            else:
                message += "No charge required"
            
            return Response({
                'success': True,
                'feature': {
                    'code': feature.code,
                    'name': feature.name
                },
                'proration': proration,
                'message': message
            })
            
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_feature_module(request):
    """Remove a feature with immediate credit"""
    try:
        feature_code = request.data.get('feature_code')
        
        if not feature_code:
            return Response({
                'success': False,
                'error': 'Feature code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the feature module
        try:
            feature = FeatureModule.objects.get(code=feature_code)
        except FeatureModule.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Feature {feature_code} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        business = request.user.business
        
        # Check if enabled
        try:
            business_feature = BusinessFeatureModule.objects.get(
                business=business,
                feature_module=feature,
                enabled=True
            )
        except BusinessFeatureModule.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Feature not currently enabled'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Calculate proration credit
            proration = ProrationService.calculate_proration(
                request.user,
                feature,
                action='remove'
            )
            
            # Remove feature
            business_feature.enabled = False
            business_feature.removed_at = datetime.now()
            business_feature.save()
            
            # Apply credit if not testing
            credit_id = None
            if proration['charge_now'] and proration['amount'] > 0:
                credit_id = ProrationService.process_stripe_credit(
                    request.user,
                    proration['amount'],
                    proration['description']
                )
                
                # Update billing event
                if proration.get('billing_event_id'):
                    FeatureBillingEvent.objects.filter(
                        id=proration['billing_event_id']
                    ).update(
                        stripe_charge_id=credit_id,
                        charged=True if credit_id else False
                    )
            
            message = f"Removed {feature.name}. "
            if proration['is_test_account']:
                message += "Test account - no credits."
            elif proration['testing_mode']:
                message += f"Would credit ${proration['amount']} (Testing Mode)"
            elif credit_id:
                message += f"Credit of ${proration['amount']} applied"
            else:
                message += "No credit required"
            
            return Response({
                'success': True,
                'feature': {
                    'code': feature.code,
                    'name': feature.name
                },
                'credit': proration,
                'message': message
            })
            
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_feature_access(request):
    """Check if user has access to a specific feature"""
    try:
        feature_code = request.data.get('feature_code')
        
        if not feature_code:
            return Response({
                'success': False,
                'error': 'Feature code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        has_access = FeatureAccessService.has_feature_access(
            request.user,
            feature_code
        )
        
        return Response({
            'success': True,
            'feature_code': feature_code,
            'has_access': has_access,
            'testing_mode': ProrationService.TESTING_MODE
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_feature_billing_details(request):
    """Get detailed billing information including proration"""
    try:
        business = request.user.business
        
        # Calculate monthly totals
        totals = ProrationService.calculate_monthly_total(business)
        
        # Get current period dates
        subscription = business.subscription
        if subscription:
            period_start = subscription.current_period_start or datetime.now().date().replace(day=1)
            period_end = subscription.current_period_end or datetime.now().date()
            next_period_start = period_end.replace(day=1) if period_end.day != 1 else period_end
        else:
            period_start = datetime.now().date().replace(day=1)
            period_end = datetime.now().date()
            next_period_start = period_end
        
        # Get enabled features
        enabled_features = BusinessFeatureModule.objects.filter(
            business=business,
            enabled=True
        ).select_related('feature_module')
        
        features_list = []
        for bf in enabled_features:
            feature = bf.feature_module
            price = feature.developing_country_price if business.is_developing_country else feature.monthly_price
            
            # Check if recently added (within current period)
            recently_added = bf.added_at.date() >= period_start if bf.added_at else False
            
            features_list.append({
                'code': feature.code,
                'name': feature.name,
                'monthly_price': float(price),
                'recently_added': recently_added,
                'added_date': bf.added_at.strftime('%Y-%m-%d') if bf.added_at else None
            })
        
        # Get recent billing events
        recent_events = FeatureBillingEvent.objects.filter(
            business=business,
            event_date__gte=period_start
        ).select_related('feature_module').order_by('-event_date')[:10]
        
        recent_changes = []
        for event in recent_events:
            recent_changes.append({
                'id': str(event.id),
                'date': event.event_date.strftime('%Y-%m-%d'),
                'type': 'charge' if event.prorated_amount > 0 else 'credit',
                'description': f"{event.event_type.title()} {event.feature_module.name}",
                'amount': float(abs(event.prorated_amount)),
                'charged': event.charged
            })
        
        # Determine base plan name
        if subscription:
            base_plan = subscription.selected_plan.title()
        else:
            base_plan = 'Free'
        
        return Response({
            'success': True,
            'period_start': period_start.strftime('%Y-%m-%d'),
            'period_end': period_end.strftime('%Y-%m-%d'),
            'next_period_start': next_period_start.strftime('%Y-%m-%d'),
            'base_plan': base_plan,
            'base_price': float(totals['base_price']),
            'features': features_list,
            'recent_changes': recent_changes,
            'next_month_total': float(totals['total']),
            'testing_mode': ProrationService.TESTING_MODE,
            'is_test_account': request.user.email in ProrationService.TEST_ACCOUNTS,
            'is_developing_country': business.is_developing_country if hasattr(business, 'is_developing_country') else False
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_feature_catalog(request):
    """Get full catalog of available features"""
    try:
        # Get all active features
        features = FeatureModule.objects.filter(is_active=True).order_by('category', 'name')
        
        # Group by category
        catalog = {}
        for feature in features:
            if feature.category not in catalog:
                catalog[feature.category] = []
            
            catalog[feature.category].append({
                'code': feature.code,
                'name': feature.name,
                'description': feature.description,
                'price': float(feature.monthly_price),
                'developing_price': float(feature.developing_country_price),
                'is_core': feature.is_core,
                'required_features': feature.required_features
            })
        
        return Response({
            'success': True,
            'catalog': catalog,
            'testing_mode': ProrationService.TESTING_MODE
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)