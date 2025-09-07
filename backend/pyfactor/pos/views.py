"""
POS API Views for mobile app integration
"""
import logging
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from inventory.models import Product, ProductTypeFields
from inventory.business_config_models import BusinessInventoryConfig
from taxes.models import GlobalSalesTaxRate
from users.models import UserProfile, Business
from custom_auth.models import Tenant
from django_countries import countries

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pos_config(request):
    """
    Get POS configuration including business type, tax rate, currency, and inventory config
    """
    try:
        user = request.user
        profile = UserProfile.objects.get(user=user)
        
        # Get business information
        business = Business.objects.filter(owner=user).first()
        if not business:
            return Response({
                'error': 'No business found for user'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get business country
        business_country = business.country or 'US'
        
        # Get tax rate for country
        try:
            tax_config = GlobalSalesTaxRate.objects.get(country=business_country)
            tax_rate = float(tax_config.rate)
            tax_type = tax_config.tax_type
        except GlobalSalesTaxRate.DoesNotExist:
            tax_rate = 0.0
            tax_type = 'NONE'
        
        # Get inventory configuration
        try:
            inventory_config = BusinessInventoryConfig.objects.get(
                tenant_id=profile.tenant_id,
                business_type=business.business_type
            )
            config_data = {
                'inventory_term': inventory_config.inventory_term,
                'item_singular': inventory_config.item_singular,
                'item_plural': inventory_config.item_plural,
                'features': inventory_config.features,
                'required_fields': inventory_config.required_fields,
            }
        except BusinessInventoryConfig.DoesNotExist:
            # Use default config
            default_config = BusinessInventoryConfig.get_default_config(business.business_type)
            config_data = default_config
        
        # Determine available payment methods based on country
        payment_methods = ['cash', 'card']
        if business_country == 'KE':
            payment_methods.append('mpesa')
        elif business_country in ['NG', 'GH', 'UG', 'TZ']:
            payment_methods.append('mobile_money')
        
        # Add Apple Pay for all countries (converts to USD)
        payment_methods.append('apple_pay')
        
        return Response({
            'success': True,
            'business_type': business.business_type,
            'business_name': business.name,
            'business_country': business_country,
            'tax_rate': tax_rate,
            'tax_type': tax_type,
            'currency': {
                'code': profile.preferred_currency_code or 'USD',
                'name': profile.preferred_currency_name or 'US Dollar',
                'symbol': profile.preferred_currency_symbol or '$'
            },
            'inventory_config': config_data,
            'payment_methods': payment_methods,
        })
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error getting POS config: {str(e)}")
        return Response({
            'error': 'Failed to load POS configuration'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pos_products(request):
    """
    Get products for POS based on business type and inventory configuration
    """
    try:
        user = request.user
        profile = UserProfile.objects.get(user=user)
        
        # Get business
        business = Business.objects.filter(owner=user).first()
        if not business:
            return Response({
                'error': 'No business found for user'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get inventory configuration
        try:
            inventory_config = BusinessInventoryConfig.objects.get(
                tenant_id=profile.tenant_id,
                business_type=business.business_type
            )
        except BusinessInventoryConfig.DoesNotExist:
            inventory_config = None
        
        # Get products for this tenant
        products = Product.objects.filter(
            tenant_id=profile.tenant_id,
            is_active=True
        ).select_related('category')
        
        # Filter by business-specific criteria if config exists
        if inventory_config and inventory_config.features:
            features = inventory_config.features
            
            # Apply business-specific filters
            if business.business_type == 'RESTAURANT_CAFE':
                # For restaurants, only show items marked as menu items
                products = products.filter(is_menu_item=True)
            elif business.business_type == 'PHARMACY':
                # For pharmacies, include prescription status
                products = products.filter(is_medicine=True)
            elif business.business_type == 'RETAIL_STORE':
                # For retail, include items with barcodes
                products = products.exclude(barcode__isnull=True, barcode__exact='')
        
        # Search filter
        search = request.GET.get('search', '')
        if search:
            products = products.filter(name__icontains=search)
        
        # Category filter
        category = request.GET.get('category', '')
        if category:
            products = products.filter(category__name=category)
        
        # Serialize products
        product_list = []
        for product in products[:50]:  # Limit to 50 for performance
            # Get dynamic fields if they exist
            try:
                type_fields = ProductTypeFields.objects.get(
                    product=product,
                    business_type=business.business_type
                )
                extra_fields = type_fields.fields
            except ProductTypeFields.DoesNotExist:
                extra_fields = {}
            
            product_data = {
                'id': str(product.id),
                'name': product.name,
                'price': float(product.selling_price or product.cost or 0),
                'cost': float(product.cost or 0),
                'category': product.category.name if product.category else 'General',
                'sku': product.sku,
                'barcode': product.barcode,
                'quantity_on_hand': product.quantity_on_hand,
                'unit': product.unit,
                'description': product.description,
                'extra_fields': extra_fields,
            }
            
            # Add business-specific fields
            if business.business_type == 'RESTAURANT_CAFE':
                product_data['preparation_time'] = extra_fields.get('preparation_time', '10 mins')
                product_data['allergens'] = extra_fields.get('allergens', [])
                product_data['calories'] = extra_fields.get('calories', '')
            elif business.business_type == 'PHARMACY':
                product_data['requires_prescription'] = extra_fields.get('requires_prescription', False)
                product_data['dosage'] = extra_fields.get('dosage', '')
                product_data['warnings'] = extra_fields.get('warnings', '')
            
            product_list.append(product_data)
        
        return Response({
            'success': True,
            'products': product_list,
            'total_count': products.count(),
            'business_type': business.business_type,
        })
        
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error getting POS products: {str(e)}")
        return Response({
            'error': 'Failed to load products'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_sale(request):
    """
    Process a POS sale transaction
    """
    try:
        user = request.user
        profile = UserProfile.objects.get(user=user)
        
        # Get request data
        items = request.data.get('items', [])
        payment_method = request.data.get('payment_method', 'cash')
        customer_id = request.data.get('customer_id')
        subtotal = Decimal(str(request.data.get('subtotal', 0)))
        tax = Decimal(str(request.data.get('tax', 0)))
        total = Decimal(str(request.data.get('total', 0)))
        amount_tendered = Decimal(str(request.data.get('amount_tendered', 0)))
        notes = request.data.get('notes', '')
        
        if not items:
            return Response({
                'error': 'No items in transaction'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create transaction record
        with transaction.atomic():
            # Update inventory quantities
            for item in items:
                try:
                    product = Product.objects.get(
                        id=item['id'],
                        tenant_id=profile.tenant_id
                    )
                    # Reduce inventory
                    product.quantity_on_hand -= item['quantity']
                    product.save()
                except Product.DoesNotExist:
                    logger.warning(f"Product {item['id']} not found for inventory update")
            
            # Calculate change for cash payments
            change_amount = 0
            if payment_method == 'cash':
                change_amount = amount_tendered - total
            
            # TODO: Create POSTransaction model and save transaction
            # For now, just return success
            
            transaction_data = {
                'transaction_id': 'POS' + str(profile.tenant_id)[:8] + str(user.id),
                'items': items,
                'subtotal': float(subtotal),
                'tax': float(tax),
                'total': float(total),
                'payment_method': payment_method,
                'change': float(change_amount) if payment_method == 'cash' else 0,
                'timestamp': timezone.now().isoformat(),
            }
            
            return Response({
                'success': True,
                'transaction': transaction_data,
                'message': 'Sale completed successfully'
            })
            
    except UserProfile.DoesNotExist:
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error completing sale: {str(e)}")
        return Response({
            'error': 'Failed to complete sale'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tax_rate(request):
    """
    Get tax rate based on business location
    """
    try:
        user = request.user
        business = Business.objects.filter(owner=user).first()
        
        if not business:
            return Response({
                'error': 'No business found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        country = business.country or 'US'
        
        try:
            tax_config = GlobalSalesTaxRate.objects.get(country=country)
            return Response({
                'success': True,
                'country': country,
                'country_name': dict(countries).get(country, country),
                'tax_rate': float(tax_config.rate),
                'tax_type': tax_config.tax_type,
                'tax_name': tax_config.name,
            })
        except GlobalSalesTaxRate.DoesNotExist:
            return Response({
                'success': True,
                'country': country,
                'country_name': dict(countries).get(country, country),
                'tax_rate': 0.0,
                'tax_type': 'NONE',
                'tax_name': 'No Tax',
            })
            
    except Exception as e:
        logger.error(f"Error getting tax rate: {str(e)}")
        return Response({
            'error': 'Failed to get tax rate'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)