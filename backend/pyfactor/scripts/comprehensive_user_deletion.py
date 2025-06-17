#!/usr/bin/env python3
"""
Comprehensive User Deletion Script
Handles deletion of users and all related data while respecting foreign key relationships

This script can:
1. Analyze all relationships for a user
2. Soft delete (mark as deleted but keep data)
3. Hard delete (permanently remove all data)
4. Handle cascade deletions properly
5. Create audit logs
"""

import os
import sys
import django
from django.utils import timezone
from django.db import transaction, models
from django.apps import apps
from datetime import datetime
import json

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant, AccountDeletionLog
from onboarding.models import OnboardingProgress, UserProfile
from session_manager.models import UserSession, SessionEvent
from users.models import BusinessDetails, BusinessMember, Subscription
from hr.models import Employee
from tenant_utils.models import TenantAwareModel

# Import optional models with try/except to handle missing modules
try:
    from reports.models import Report
except ImportError:
    Report = None

try:
    from integrations.models import Integration, WooCommerceIntegration
except ImportError:
    Integration = None
    WooCommerceIntegration = None


class UserDeletionManager:
    """Manages comprehensive user deletion with relationship handling"""
    
    def __init__(self):
        self.deletion_order = []
        self.relationships = {}
        self.stats = {
            'analyzed': 0,
            'deleted': 0,
            'errors': []
        }
    
    def analyze_user_relationships(self, user):
        """Analyze all foreign key relationships for a user"""
        print(f"\n🔍 Analyzing relationships for user: {user.email} (ID: {user.id})")
        print("="*60)
        
        relationships = {
            'direct_relations': {},
            'tenant_relations': {},
            'business_relations': {},
            'profile_relations': {}
        }
        
        # 1. Direct User Relations
        print("\n📌 Direct User Relations:")
        
        # UserSession
        sessions = UserSession.objects.filter(user=user)
        if sessions.exists():
            relationships['direct_relations']['UserSession'] = {
                'count': sessions.count(),
                'active': sessions.filter(is_active=True).count(),
                'objects': sessions
            }
            print(f"   - UserSessions: {sessions.count()} (Active: {sessions.filter(is_active=True).count()})")
        
        # OnboardingProgress
        onboarding = OnboardingProgress.objects.filter(user=user)
        if onboarding.exists():
            relationships['direct_relations']['OnboardingProgress'] = {
                'count': onboarding.count(),
                'objects': onboarding
            }
            print(f"   - OnboardingProgress: {onboarding.count()}")
        
        # UserProfile
        profiles = UserProfile.objects.filter(user_id=user.id)
        if profiles.exists():
            relationships['direct_relations']['UserProfile'] = {
                'count': profiles.count(),
                'objects': profiles
            }
            print(f"   - UserProfile: {profiles.count()}")
        
        # BusinessMember
        memberships = BusinessMember.objects.filter(user=user)
        if memberships.exists():
            relationships['direct_relations']['BusinessMember'] = {
                'count': memberships.count(),
                'objects': memberships
            }
            print(f"   - BusinessMemberships: {memberships.count()}")
        
        # Employee
        employees = Employee.objects.filter(user=user)
        if employees.exists():
            relationships['direct_relations']['Employee'] = {
                'count': employees.count(),
                'objects': employees
            }
            print(f"   - Employee Records: {employees.count()}")
        
        # 2. Tenant Relations (if user owns a tenant)
        print("\n🏢 Tenant Relations:")
        
        owned_tenants = Tenant.objects.filter(owner_id=str(user.id))
        if owned_tenants.exists():
            tenant = owned_tenants.first()
            relationships['tenant_relations']['Tenant'] = {
                'count': owned_tenants.count(),
                'tenant_id': str(tenant.id),
                'tenant_name': tenant.name,
                'objects': owned_tenants
            }
            print(f"   - Owned Tenants: {owned_tenants.count()} (Primary: {tenant.name})")
            
            # Find all TenantAwareModel subclasses
            tenant_models = self._get_tenant_aware_models()
            for model in tenant_models:
                if hasattr(model, 'tenant_id'):
                    tenant_data = model.objects.filter(tenant_id=tenant.id)
                    if tenant_data.exists():
                        model_name = model.__name__
                        relationships['tenant_relations'][model_name] = {
                            'count': tenant_data.count(),
                            'objects': tenant_data
                        }
                        print(f"   - {model_name}: {tenant_data.count()}")
        
        # 3. Business Relations
        print("\n💼 Business Relations:")
        
        if hasattr(user, 'tenant') and user.tenant:
            # BusinessDetails
            businesses = BusinessDetails.objects.filter(tenant=user.tenant)
            if businesses.exists():
                relationships['business_relations']['BusinessDetails'] = {
                    'count': businesses.count(),
                    'objects': businesses
                }
                print(f"   - BusinessDetails: {businesses.count()}")
            
            # Subscriptions
            subscriptions = Subscription.objects.filter(business__tenant=user.tenant)
            if subscriptions.exists():
                relationships['business_relations']['Subscription'] = {
                    'count': subscriptions.count(),
                    'active': subscriptions.filter(is_active=True).count(),
                    'objects': subscriptions
                }
                print(f"   - Subscriptions: {subscriptions.count()} (Active: {subscriptions.filter(is_active=True).count()})")
        
        # 4. Profile Relations
        print("\n👤 Profile Relations:")
        
        # Reports
        if Report:
            reports = Report.objects.filter(user=user)
            if reports.exists():
                relationships['profile_relations']['Report'] = {
                    'count': reports.count(),
                    'objects': reports
                }
                print(f"   - Reports: {reports.count()}")
        
        # Integrations
        if Integration:
            integrations = Integration.objects.filter(user=user)
            if integrations.exists():
                relationships['profile_relations']['Integration'] = {
                    'count': integrations.count(),
                    'objects': integrations
                }
                print(f"   - Integrations: {integrations.count()}")
        
        # WooCommerce Integrations
        if WooCommerceIntegration:
            woo_integrations = WooCommerceIntegration.objects.filter(user=user)
            if woo_integrations.exists():
                relationships['profile_relations']['WooCommerceIntegration'] = {
                    'count': woo_integrations.count(),
                    'objects': woo_integrations
                }
                print(f"   - WooCommerce Integrations: {woo_integrations.count()}")
        
        self.relationships = relationships
        self._calculate_deletion_order()
        
        print("\n📊 Summary:")
        total_objects = sum(
            sum(rel.get('count', 0) for rel in category.values())
            for category in relationships.values()
        )
        print(f"   Total related objects: {total_objects}")
        
        return relationships
    
    def _get_tenant_aware_models(self):
        """Get all models that inherit from TenantAwareModel"""
        tenant_models = []
        for model in apps.get_models():
            if issubclass(model, TenantAwareModel) and model != TenantAwareModel:
                tenant_models.append(model)
        return tenant_models
    
    def _calculate_deletion_order(self):
        """Calculate the correct order for deletion based on foreign key dependencies"""
        # Order matters! Delete in reverse order of dependencies
        self.deletion_order = [
            # Profile relations (least dependent)
            'WooCommerceIntegration',
            'Integration',
            'Report',
            
            # HR relations
            'Employee',
            
            # Business relations
            'Subscription',
            'BusinessMember',
            'BusinessDetails',
            
            # Tenant data (all TenantAwareModel instances)
            'TenantData',  # Placeholder for all tenant-specific data
            
            # Session data
            'SessionEvent',
            'UserSession',
            
            # Onboarding
            'UserProfile',
            'OnboardingProgress',
            
            # Core relations
            'Tenant',  # Only if user owns it
            'User'     # Finally, the user itself
        ]
    
    def soft_delete_user(self, user, reason="User requested deletion"):
        """Soft delete - mark user as deleted but keep data"""
        print(f"\n🗑️  Soft deleting user: {user.email}")
        
        try:
            with transaction.atomic():
                # Mark user as inactive and deleted
                user.is_active = False
                user.is_deleted = True
                user.deleted_at = timezone.now()
                user.save()
                
                # Invalidate all sessions
                UserSession.objects.filter(user=user, is_active=True).update(
                    is_active=False,
                    invalidated_at=timezone.now()
                )
                
                # Create deletion log
                AccountDeletionLog.objects.create(
                    user_id=user.id,
                    user_email=user.email,
                    tenant_id=user.tenant.id if user.tenant else None,
                    auth0_sub=getattr(user, 'auth0_sub', None),
                    deletion_reason=reason,
                    deletion_initiated_by='self',
                    database_deleted=False,  # Soft delete
                    auth0_deleted=False  # Not deleted from Auth0 in soft delete
                )
                
                print("✅ User soft deleted successfully")
                print("   - User marked as inactive and deleted")
                print("   - All sessions invalidated")
                print("   - Deletion log created")
                
                return True
                
        except Exception as e:
            print(f"❌ Error during soft delete: {str(e)}")
            self.stats['errors'].append(f"Soft delete error: {str(e)}")
            return False
    
    def hard_delete_user(self, user, reason="Permanent deletion requested"):
        """Hard delete - permanently remove user and all related data"""
        print(f"\n🔥 Hard deleting user: {user.email}")
        print("⚠️  WARNING: This action is irreversible!")
        
        # First analyze relationships
        relationships = self.analyze_user_relationships(user)
        
        # Confirm deletion
        response = input("\n❓ Are you sure you want to permanently delete this user and all related data? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Deletion cancelled")
            return False
        
        try:
            with transaction.atomic():
                # Create deletion log first (before user is deleted)
                deletion_log = AccountDeletionLog.objects.create(
                    user_id=user.id,
                    user_email=user.email,
                    tenant_id=user.tenant.id if user.tenant else None,
                    auth0_sub=getattr(user, 'auth0_sub', None),
                    deletion_reason=reason,
                    deletion_initiated_by='admin',
                    database_deleted=True,  # Will be hard deleted
                    auth0_deleted=False,  # Not handling Auth0 in this script
                    deletion_errors={
                        'relationships': self._serialize_relationships(relationships)
                    }
                )
                
                # Delete in the correct order
                print("\n🔄 Deleting related objects...")
                
                # Profile relations
                for model_name in ['WooCommerceIntegration', 'Integration', 'Report']:
                    self._delete_related_objects('profile_relations', model_name)
                
                # Direct relations
                for model_name in ['Employee', 'BusinessMember', 'UserProfile', 'OnboardingProgress']:
                    self._delete_related_objects('direct_relations', model_name)
                
                # Session data (SessionEvents are cascade deleted with UserSession)
                self._delete_related_objects('direct_relations', 'UserSession')
                
                # Business relations
                for model_name in ['Subscription', 'BusinessDetails']:
                    self._delete_related_objects('business_relations', model_name)
                
                # Tenant data
                if 'Tenant' in relationships.get('tenant_relations', {}):
                    print("\n🏢 Deleting tenant and all tenant data...")
                    tenant_data = relationships['tenant_relations']['Tenant']
                    tenant = tenant_data['objects'].first()
                    
                    # Delete all tenant-specific data
                    tenant_models = self._get_tenant_aware_models()
                    for model in tenant_models:
                        if hasattr(model, 'tenant_id'):
                            count = model.objects.filter(tenant_id=tenant.id).delete()[0]
                            if count > 0:
                                print(f"   - Deleted {count} {model.__name__} records")
                    
                    # Delete the tenant itself
                    tenant.delete()
                    print(f"   - Deleted tenant: {tenant.name}")
                
                # Finally, delete the user
                user_email = user.email
                user.delete()
                print(f"\n✅ User {user_email} and all related data permanently deleted")
                
                # Note: deletion log was already created and saved
                
                return True
                
        except Exception as e:
            print(f"\n❌ Error during hard delete: {str(e)}")
            self.stats['errors'].append(f"Hard delete error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _delete_related_objects(self, category, model_name):
        """Delete related objects for a specific model"""
        if category in self.relationships and model_name in self.relationships[category]:
            objects = self.relationships[category][model_name]['objects']
            count = objects.count()
            if count > 0:
                objects.delete()
                print(f"   - Deleted {count} {model_name} records")
                self.stats['deleted'] += count
    
    def _serialize_relationships(self, relationships):
        """Serialize relationships for storage in deletion log"""
        serialized = {}
        for category, models in relationships.items():
            serialized[category] = {}
            for model_name, data in models.items():
                serialized[category][model_name] = {
                    'count': data['count'],
                    'active': data.get('active', 0)
                }
        return serialized
    
    def restore_soft_deleted_user(self, email):
        """Restore a soft-deleted user"""
        try:
            user = User.objects.get(email=email, is_deleted=True)
            
            with transaction.atomic():
                user.is_active = True
                user.is_deleted = False
                user.deleted_at = None
                user.save()
                
                # Log the restoration
                AccountDeletionLog.objects.create(
                    user_id=user.id,
                    user_email=user.email,
                    tenant_id=user.tenant.id if user.tenant else None,
                    auth0_sub=getattr(user, 'auth0_sub', None),
                    deletion_reason='User restoration',
                    deletion_initiated_by='admin',
                    database_deleted=False,
                    auth0_deleted=False,
                    deletion_errors={'action': 'restore', 'restored_at': timezone.now().isoformat()}
                )
                
                print(f"✅ User {email} restored successfully")
                return True
                
        except User.DoesNotExist:
            print(f"❌ No soft-deleted user found with email: {email}")
            return False
        except Exception as e:
            print(f"❌ Error restoring user: {str(e)}")
            return False


def main():
    """Main function with CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Comprehensive User Deletion Tool')
    parser.add_argument('email', help='Email address of the user to delete')
    parser.add_argument('--soft', action='store_true', default=True, help='Soft delete (default)')
    parser.add_argument('--hard', action='store_true', help='Hard delete (permanent)')
    parser.add_argument('--analyze', action='store_true', help='Only analyze relationships')
    parser.add_argument('--restore', action='store_true', help='Restore soft-deleted user')
    parser.add_argument('--reason', default='User requested deletion', help='Reason for deletion')
    
    args = parser.parse_args()
    
    manager = UserDeletionManager()
    
    try:
        if args.restore:
            manager.restore_soft_deleted_user(args.email)
        else:
            user = User.objects.get(email=args.email)
            
            if args.analyze:
                manager.analyze_user_relationships(user)
            elif args.hard:
                manager.hard_delete_user(user, args.reason)
            else:
                manager.soft_delete_user(user, args.reason)
                
    except User.DoesNotExist:
        print(f"❌ User not found: {args.email}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()