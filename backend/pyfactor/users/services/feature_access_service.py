"""
Feature Access Service
Determines which features a user/business can access
"""
from django.conf import settings
from users.services.proration_service import TEST_ACCOUNTS, TESTING_MODE

# Core features that are always free (may vary by business type)
CORE_FEATURES = [
    'dashboard',
    'pos',
    'inventory', 
    'customers',
    'invoicing',
    'banking',
    'menu',  # For restaurants/food businesses
    'orders',  # For service/retail businesses
    'discover',  # Marketplace discovery (already in footer)
    'advertise',
    'invite',
    'qr_code',
    'business_wallet'
]

# Feature pricing map for reference
FEATURE_PRICING = {
    # Core features (always free)
    'dashboard': 0,
    'pos': 0,
    'inventory': 0,
    'customers': 0,
    'invoicing': 0,
    'banking': 0,
    'menu': 0,  # Free for restaurants/food businesses
    'orders': 0,  # Free for all businesses
    'discover': 0,  # Free marketplace discovery
    
    # À la carte modules
    'payroll': 15.00,  # $15/month
    'hr': 15.00,       # Part of Payroll/HR bundle
    'timesheets': 15.00,  # Part of Payroll/HR bundle
    'attendance': 15.00,  # Part of Payroll/HR bundle
    'recruitment': 15.00,  # Part of Payroll/HR bundle
    
    'analytics': 5.00,  # Advanced analytics
    'smart_insights': 5.00,  # Part of analytics
    'reports': 5.00,  # Advanced reports
    
    'accounting': 10.00,  # Accounting Pro
    'journal_entries': 10.00,  # Part of accounting
    'chart_of_accounts': 10.00,  # Part of accounting
    
    'marketing': 6.00,   # Marketing suite
    'whatsapp_business': 6.00,  # Part of marketing
    'email_campaigns': 6.00,  # Part of marketing
    
    'jobs': 12.00,  # Operations management
    'transport': 12.00,  # Transport management
    'courier': 12.00,  # Courier services
    
    'multi_location': 10.00,  # Per additional location
    'workflow_automation': 8.00,  # Workflow automation
    'ecommerce': 10.00,  # E-commerce features
}

class FeatureAccessService:
    """Service to check feature access for users"""
    
    @staticmethod
    def get_business_core_features(business_type):
        """
        Get core features based on business type
        
        Args:
            business_type: Business type (SERVICE, RETAIL, RESTAURANT, etc.)
            
        Returns:
            List of core feature codes for this business type
        """
        # Base features for all businesses
        base_features = [
            'dashboard',
            'customers',
            'invoicing',
            'banking',
            'orders',
            'discover',
            'advertise',
            'invite',
            'qr_code',
            'business_wallet'
        ]
        
        # Add business type specific features
        if business_type in ['RETAIL', 'GROCERY', 'PHARMACY', 'SHOP']:
            # Retail businesses get POS and inventory
            base_features.extend(['pos', 'inventory'])
        elif business_type in ['RESTAURANT', 'FOOD', 'CAFE', 'BAR']:
            # Food businesses get POS, inventory, and menu
            base_features.extend(['pos', 'inventory', 'menu'])
        elif business_type in ['SERVICE', 'CONSULTING', 'PROFESSIONAL']:
            # Service businesses focus on orders and invoicing
            # They already have orders and invoicing in base
            pass
        else:
            # Mixed/Other businesses get everything
            base_features.extend(['pos', 'inventory', 'menu'])
        
        return base_features
    
    @staticmethod
    def has_feature_access(user, feature_code):
        """
        Check if user has access to a specific feature
        
        Args:
            user: User object
            feature_code: String identifier for the feature
            
        Returns:
            Boolean indicating access
        """
        # Test accounts always have full access
        if user.email in TEST_ACCOUNTS:
            return True
        
        # During testing phase, everyone has access
        if TESTING_MODE:
            return True
        
        # Get business-specific core features
        if hasattr(user, 'business') and user.business:
            business_type = getattr(user.business, 'simplified_business_type', 'OTHER')
            core_features = FeatureAccessService.get_business_core_features(business_type)
            
            if feature_code in core_features:
                return True
        else:
            # No business, check against general core features
            if feature_code in CORE_FEATURES:
                return True
        
        # Check if feature module is enabled for business
        from users.models import BusinessFeatureModule, FeatureModule
        
        try:
            # First check if this feature exists as a module
            feature_module = FeatureModule.objects.filter(
                code=feature_code,
                is_active=True
            ).first()
            
            if not feature_module:
                # Feature doesn't exist as a paid module, allow access
                return True
            
            # Check if business has this module enabled
            has_module = BusinessFeatureModule.objects.filter(
                business=user.business,
                feature_module=feature_module,
                enabled=True
            ).exists()
            
            return has_module
            
        except Exception as e:
            print(f"Error checking feature access: {e}")
            # Default to allowing access in case of error during testing
            return TESTING_MODE
    
    @staticmethod
    def get_user_features(user):
        """
        Get all features available to a user
        
        Returns:
            Dict with feature categories and their status
        """
        from users.models import BusinessFeatureModule, FeatureModule
        
        # Get business-specific core features
        if hasattr(user, 'business') and user.business:
            business_type = getattr(user.business, 'simplified_business_type', 'OTHER')
            core_features = FeatureAccessService.get_business_core_features(business_type)
        else:
            core_features = CORE_FEATURES.copy()
        
        # Start with core features
        features = {
            'core': core_features,
            'business_type': getattr(user.business, 'simplified_business_type', 'OTHER') if hasattr(user, 'business') else None,
            'enabled_modules': [],
            'available_modules': [],
            'is_test_account': user.email in TEST_ACCOUNTS,
            'testing_mode': TESTING_MODE
        }
        
        # If test account or testing mode, give everything
        if user.email in TEST_ACCOUNTS or TESTING_MODE:
            all_features = list(FEATURE_PRICING.keys())
            features['enabled_modules'] = all_features
            return features
        
        try:
            # Get enabled modules
            enabled = BusinessFeatureModule.objects.filter(
                business=user.business,
                enabled=True
            ).select_related('feature_module')
            
            features['enabled_modules'] = [
                {
                    'code': bfm.feature_module.code,
                    'name': bfm.feature_module.name,
                    'price': float(bfm.feature_module.monthly_price)
                }
                for bfm in enabled
            ]
            
            # Get available modules (not yet enabled)
            enabled_codes = [bfm.feature_module.code for bfm in enabled]
            available = FeatureModule.objects.filter(
                is_active=True,
                is_core=False
            ).exclude(code__in=enabled_codes)
            
            features['available_modules'] = [
                {
                    'code': fm.code,
                    'name': fm.name,
                    'description': fm.description,
                    'price': float(fm.monthly_price),
                    'developing_price': float(fm.developing_country_price)
                }
                for fm in available
            ]
            
        except Exception as e:
            print(f"Error getting user features: {e}")
        
        return features
    
    @staticmethod
    def check_feature_dependencies(feature_code):
        """
        Check if a feature has unmet dependencies
        
        Returns:
            Tuple (can_enable: bool, missing_dependencies: list)
        """
        from users.models import FeatureModule
        
        try:
            feature = FeatureModule.objects.get(code=feature_code)
            
            if not feature.required_features:
                return True, []
            
            # Check if all required features are enabled
            # This would need to be checked per business in real implementation
            missing = []
            for req_code in feature.required_features:
                # Check if required feature exists
                if not FeatureModule.objects.filter(code=req_code).exists():
                    missing.append(req_code)
            
            return len(missing) == 0, missing
            
        except FeatureModule.DoesNotExist:
            return False, [f"Feature {feature_code} not found"]
        except Exception as e:
            print(f"Error checking dependencies: {e}")
            return False, [str(e)]