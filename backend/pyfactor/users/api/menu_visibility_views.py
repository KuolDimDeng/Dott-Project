from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction as db_transaction
from users.models import MenuVisibilitySettings, BusinessDetails
from users.business_categories import get_features_for_business_type
import logging

logger = logging.getLogger(__name__)

# Define all menu items with their structure
MENU_STRUCTURE = {
    'dashboard': {
        'label': 'Dashboard',
        'parent': None,
        'default_visible': True
    },
    'createNew': {
        'label': 'Create New',
        'parent': None,
        'default_visible': True,
        'submenus': {
            'pos': {
                'label': 'Point of Sale',
                'feature': 'pos'
            },
            'transactions': {
                'label': 'Transactions',
                'feature': None
            },
            'catalog': {
                'label': 'Catalog',
                'feature': 'pos'
            },
            'services': {
                'label': 'Services',
                'feature': None
            },
            'jobs': {
                'label': 'Jobs',
                'feature': 'jobs'
            }
        }
    },
    'calendar': {
        'label': 'Calendar',
        'parent': None,
        'default_visible': True
    },
    'sales': {
        'label': 'Sales',
        'parent': None,
        'default_visible': True,
        'submenus': {
            'customers': {'label': 'Customers'},
            'quotes': {'label': 'Quotes'},
            'invoices': {'label': 'Invoices'},
            'creditNotes': {'label': 'Credit Notes'},
            'receipts': {'label': 'Receipts'},
        }
    },
    'purchasing': {
        'label': 'Purchasing',
        'parent': None,
        'default_visible': True,
        'submenus': {
            'vendors': {'label': 'Vendors'},
            'purchaseOrders': {'label': 'Purchase Orders'},
            'bills': {'label': 'Bills'},
            'vendorCredits': {'label': 'Vendor Credits'},
            'vendorPayments': {'label': 'Vendor Payments'},
        }
    },
    'jobs': {
        'label': 'Jobs',
        'parent': None,
        'feature': 'jobs',
        'submenus': {
            'jobsList': {'label': 'Jobs List'},
            'jobCosting': {'label': 'Job Costing'},
            'jobMaterials': {'label': 'Materials Usage'},
            'jobLabor': {'label': 'Labor Tracking'},
            'jobProfitability': {'label': 'Profitability Analysis'},
        }
    },
    'payments': {
        'label': 'Payments',
        'parent': None,
        'default_visible': True,
        'submenus': {
            'paymentsDashboard': {'label': 'Dashboard'},
            'receivePayments': {'label': 'Receive Payments'},
            'makePayments': {'label': 'Make Payments'},
            'paymentHistory': {'label': 'Payment History'},
            'paymentMethods': {'label': 'Payment Methods'},
        }
    },
    'inventory': {
        'label': 'Inventory',
        'parent': None,
        'default_visible': True,
        'submenus': {
            'inventoryDashboard': {'label': 'Dashboard'},
            'products': {'label': 'Products'},
            'categories': {'label': 'Categories'},
            'warehouses': {'label': 'Warehouses'},
            'adjustments': {'label': 'Adjustments'},
            'transfers': {'label': 'Transfers'},
            'lowStock': {'label': 'Low Stock'},
            'stockValuation': {'label': 'Stock Valuation'},
        }
    },
    'hr': {
        'label': 'HR',
        'parent': None,
        'default_visible': True,
        'requiresAdmin': True,
        'submenus': {
            'employees': {'label': 'Employees'},
            'payroll': {'label': 'Payroll'},
            'attendance': {'label': 'Attendance'},
            'recruitment': {'label': 'Recruitment'},
            'companyDocs': {'label': 'Company Documents'},
        }
    },
    'accounting': {
        'label': 'Accounting',
        'parent': None,
        'default_visible': True,
        'submenus': {
            'chartOfAccounts': {'label': 'Chart of Accounts'},
            'journalEntries': {'label': 'Journal Entries'},
            'bankReconciliation': {'label': 'Bank Reconciliation'},
            'taxes': {'label': 'Taxes'},
            'openingBalances': {'label': 'Opening Balances'},
        }
    },
    'reports': {
        'label': 'Reports',
        'parent': None,
        'default_visible': True
    },
    'analytics': {
        'label': 'Analytics',
        'parent': None,
        'default_visible': True
    },
    'smartInsights': {
        'label': 'Smart Business Insights',
        'parent': None,
        'default_visible': True
    },
    'whatsappBusiness': {
        'label': 'WhatsApp Business',
        'parent': None,
        'default_visible': False  # Special handling based on country
    },
    'importExport': {
        'label': 'Import/Export',
        'parent': None,
        'default_visible': True,
        'requiresAdmin': True
    },
    'recyclingBin': {
        'label': 'Recycling Bin',
        'parent': None,
        'default_visible': True
    },
    'dottStatus': {
        'label': 'Dott Status',
        'parent': None,
        'default_visible': True
    }
}


class MenuVisibilityView(APIView):
    """Get and update menu visibility settings for a business"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current menu visibility settings"""
        try:
            user = request.user
            # Get the business through BusinessMembership
            from users.models import BusinessMembership
            membership = BusinessMembership.objects.filter(
                user=user,
                is_active=True
            ).select_related('business').first()
            
            if not membership:
                return Response(
                    {'error': 'No active business membership found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            business = membership.business
            
            # Get all visibility settings for this business
            visibility_settings = MenuVisibilitySettings.objects.filter(
                business=business
            ).select_related('business')
            
            # Create a dictionary of current settings
            current_settings = {
                setting.menu_item: setting.is_visible 
                for setting in visibility_settings
            }
            
            # Get business features based on type
            business_details = BusinessDetails.objects.filter(business=business).first()
            features = ['jobs', 'pos']  # Default to all
            
            if business_details and business_details.simplified_business_type:
                features = get_features_for_business_type(business_details.simplified_business_type)
            
            # Build complete menu structure with visibility
            menu_data = []
            for menu_key, menu_info in MENU_STRUCTURE.items():
                # Determine default visibility
                default_visible = menu_info.get('default_visible', True)
                
                # Check if menu requires specific feature
                if 'feature' in menu_info and menu_info['feature']:
                    default_visible = menu_info['feature'] in features
                
                # Get actual visibility (use setting if exists, otherwise default)
                is_visible = current_settings.get(menu_key, default_visible)
                
                menu_item = {
                    'key': menu_key,
                    'label': menu_info['label'],
                    'is_visible': is_visible,
                    'default_visible': default_visible,
                    'requires_admin': menu_info.get('requiresAdmin', False),
                    'submenus': []
                }
                
                # Add submenus if they exist
                if 'submenus' in menu_info:
                    for sub_key, sub_info in menu_info['submenus'].items():
                        sub_menu_key = f"{menu_key}.{sub_key}"
                        
                        # Check if submenu requires specific feature
                        sub_default_visible = is_visible  # Inherit parent visibility
                        if 'feature' in sub_info and sub_info['feature']:
                            sub_default_visible = is_visible and sub_info['feature'] in features
                        
                        sub_is_visible = current_settings.get(sub_menu_key, sub_default_visible)
                        
                        menu_item['submenus'].append({
                            'key': sub_menu_key,
                            'label': sub_info['label'],
                            'is_visible': sub_is_visible,
                            'default_visible': sub_default_visible,
                            'parent_visible': is_visible
                        })
                
                menu_data.append(menu_item)
            
            return Response({
                'menu_settings': menu_data,
                'business_features': features,
                'business_type': business_details.simplified_business_type if business_details else None
            })
            
        except Exception as e:
            logger.error(f"Error fetching menu visibility: {str(e)}")
            return Response(
                {'error': 'Failed to fetch menu settings'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Update menu visibility settings"""
        try:
            user = request.user
            # Get the business through BusinessMembership
            from users.models import BusinessMembership
            membership = BusinessMembership.objects.filter(
                user=user,
                is_active=True
            ).select_related('business').first()
            
            if not membership:
                return Response(
                    {'error': 'No active business membership found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            business = membership.business
            
            # Check if user is owner or admin
            if user.role not in ['OWNER', 'ADMIN']:
                return Response(
                    {'error': 'Only owners and admins can modify menu settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            updates = request.data.get('updates', [])
            
            with db_transaction.atomic():
                for update in updates:
                    menu_item = update.get('menu_item')
                    is_visible = update.get('is_visible')
                    
                    if menu_item and is_visible is not None:
                        MenuVisibilitySettings.objects.update_or_create(
                            business=business,
                            menu_item=menu_item,
                            defaults={
                                'is_visible': is_visible,
                                'parent_menu': update.get('parent_menu')
                            }
                        )
            
            return Response({'success': True, 'message': 'Menu settings updated successfully'})
            
        except Exception as e:
            logger.error(f"Error updating menu visibility: {str(e)}")
            return Response(
                {'error': 'Failed to update menu settings'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserMenuAccessView(APIView):
    """Get effective menu access for a user (combines visibility and privileges)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get menu items accessible to the current user"""
        try:
            user = request.user
            # Get the business through BusinessMembership
            from users.models import BusinessMembership
            membership = BusinessMembership.objects.filter(
                user=user,
                is_active=True
            ).select_related('business').first()
            
            if not membership:
                return Response(
                    {'error': 'No active business membership found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            business = membership.business
            
            # Get menu visibility settings
            visibility_settings = MenuVisibilitySettings.objects.filter(
                business=business,
                is_visible=True
            ).values_list('menu_item', flat=True)
            
            # Get user's menu privileges
            # For now, return all visible menus (you can add MenuPrivilege filtering here)
            
            return Response({
                'accessible_menus': list(visibility_settings),
                'user_role': user.role
            })
            
        except Exception as e:
            logger.error(f"Error fetching user menu access: {str(e)}")
            return Response(
                {'error': 'Failed to fetch menu access'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )