/**
 * Navigation Configuration - Complete menu structure
 * Centralized configuration for all navigation items
 */

import * as NavIcons from '@/shared/icons/nav';
import * as BusinessIcons from '@/shared/icons/business';
import * as FinanceIcons from '@/shared/icons/finance';
import * as HRIcons from '@/shared/icons/hr';
import * as UtilityIcons from '@/shared/icons/utility';
import * as SocialIcons from '@/shared/icons/social';

// Main navigation groups with all menu items
export const menuGroups = {
  main: {
    title: 'navigation.main',
    items: [
      {
        id: 'dashboard',
        label: 'navigation.dashboard',
        icon: NavIcons.Dashboard,
        href: '/dashboard',
        view: 'dashboard',
        permission: 'view_dashboard'
      },
      {
        id: 'analytics',
        label: 'navigation.analytics',
        icon: NavIcons.Analytics,
        href: '/dashboard?view=analytics',
        view: 'analytics',
        permission: 'view_analytics'
      },
      {
        id: 'reports',
        label: 'navigation.reports',
        icon: NavIcons.Reports,
        href: '/dashboard?view=reports',
        view: 'reports',
        permission: 'view_reports'
      }
    ]
  },
  
  sales: {
    title: 'navigation.sales',
    items: [
      {
        id: 'pos',
        label: 'navigation.pos',
        icon: BusinessIcons.Cart,
        href: '/dashboard?view=pos',
        view: 'pos',
        permission: 'use_pos',
        businessType: ['RETAIL', 'MIXED']
      },
      {
        id: 'customers',
        label: 'navigation.customers',
        icon: BusinessIcons.Contacts,
        href: '/dashboard?view=customers',
        view: 'customers',
        permission: 'view_customers'
      },
      {
        id: 'invoices',
        label: 'navigation.invoices',
        icon: BusinessIcons.Sales,
        href: '/dashboard?view=invoices',
        view: 'invoices',
        permission: 'view_invoices'
      },
      {
        id: 'shipping',
        label: 'navigation.shipping',
        icon: BusinessIcons.Shipping,
        href: '/dashboard?view=shipping',
        view: 'shipping',
        permission: 'manage_shipping'
      }
    ]
  },
  
  inventory: {
    title: 'navigation.inventory',
    items: [
      {
        id: 'products',
        label: 'navigation.products',
        icon: BusinessIcons.Inventory,
        href: '/dashboard?view=products',
        view: 'products',
        permission: 'view_products'
      },
      {
        id: 'suppliers',
        label: 'navigation.suppliers',
        icon: BusinessIcons.Shipping,
        href: '/dashboard?view=suppliers',
        view: 'suppliers',
        permission: 'view_suppliers'
      },
      {
        id: 'smartbusiness',
        label: 'navigation.smartbusiness',
        icon: BusinessIcons.SmartBusiness,
        href: '/dashboard?view=smartbusiness',
        view: 'smartbusiness',
        permission: 'use_smart_business'
      }
    ]
  },
  
  finance: {
    title: 'navigation.finance',
    items: [
      {
        id: 'banking',
        label: 'navigation.banking',
        icon: FinanceIcons.Bank,
        href: '/dashboard?view=banking',
        view: 'banking',
        permission: 'view_banking'
      },
      {
        id: 'payments',
        label: 'navigation.payments',
        icon: FinanceIcons.Payments,
        href: '/dashboard?view=payments',
        view: 'payments',
        permission: 'view_payments'
      },
      {
        id: 'wallet',
        label: 'navigation.wallet',
        icon: FinanceIcons.Wallet,
        href: '/dashboard?view=wallet',
        view: 'wallet',
        permission: 'use_wallet'
      },
      {
        id: 'taxes',
        label: 'navigation.taxes',
        icon: FinanceIcons.Tax,
        href: '/dashboard?view=taxes',
        view: 'taxes',
        permission: 'view_taxes'
      },
      {
        id: 'chartofaccounts',
        label: 'navigation.chartofaccounts',
        icon: FinanceIcons.ChartOfAccounts,
        href: '/dashboard?view=chartofaccounts',
        view: 'chartofaccounts',
        permission: 'manage_accounting'
      }
    ]
  },
  
  hr: {
    title: 'navigation.hr',
    items: [
      {
        id: 'jobs',
        label: 'navigation.jobs',
        icon: HRIcons.Jobs,
        href: '/dashboard?view=jobs',
        view: 'jobs',
        permission: 'view_jobs',
        businessType: ['SERVICE', 'MIXED']
      },
      {
        id: 'employees',
        label: 'navigation.employees',
        icon: HRIcons.People,
        href: '/dashboard?view=employees',
        view: 'employees',
        permission: 'view_employees'
      },
      {
        id: 'payroll',
        label: 'navigation.payroll',
        icon: HRIcons.Work,
        href: '/dashboard?view=payroll',
        view: 'payroll',
        permission: 'manage_payroll'
      },
      {
        id: 'schedule',
        label: 'navigation.schedule',
        icon: HRIcons.Calendar,
        href: '/dashboard?view=schedule',
        view: 'schedule',
        permission: 'view_schedule'
      }
    ]
  },
  
  admin: {
    title: 'navigation.admin',
    items: [
      {
        id: 'settings',
        label: 'navigation.settings',
        icon: NavIcons.Settings,
        href: '/dashboard?view=settings',
        view: 'settings',
        permission: 'manage_settings'
      },
      {
        id: 'importexport',
        label: 'navigation.importexport',
        icon: NavIcons.ImportExport,
        href: '/dashboard?view=importexport',
        view: 'importexport',
        permission: 'import_export_data'
      },
      {
        id: 'calendar',
        label: 'navigation.calendar',
        icon: NavIcons.Calendar,
        href: '/dashboard?view=calendar',
        view: 'calendar',
        permission: 'view_calendar'
      }
    ]
  },
  
  social: {
    title: 'navigation.social',
    items: [
      {
        id: 'invite',
        label: 'navigation.invite',
        icon: SocialIcons.InviteFriend,
        href: '/dashboard?view=invite',
        view: 'invite',
        permission: 'send_invites'
      },
      {
        id: 'whatsapp',
        label: 'navigation.whatsapp',
        icon: SocialIcons.WhatsAppBusiness,
        href: '/dashboard?view=whatsapp',
        view: 'whatsapp',
        permission: 'use_whatsapp',
        featureFlag: 'show_whatsapp_commerce'
      }
    ]
  }
};

// Helper function to get visible menu items based on permissions and business type
export const getVisibleMenuItems = (permissions = [], businessType = null, features = {}) => {
  const visibleGroups = {};
  
  Object.entries(menuGroups).forEach(([groupKey, group]) => {
    const visibleItems = group.items.filter(item => {
      // Check permission
      if (item.permission && !permissions.includes(item.permission)) {
        return false;
      }
      
      // Check business type
      if (item.businessType && businessType && !item.businessType.includes(businessType)) {
        return false;
      }
      
      // Check feature flags
      if (item.featureFlag && !features[item.featureFlag]) {
        return false;
      }
      
      return true;
    });
    
    if (visibleItems.length > 0) {
      visibleGroups[groupKey] = {
        ...group,
        items: visibleItems
      };
    }
  });
  
  return visibleGroups;
};

// Export flattened list of all menu items for search/routing
export const allMenuItems = Object.values(menuGroups)
  .flatMap(group => group.items)
  .map(item => ({
    ...item,
    searchText: `${item.label} ${item.id}`.toLowerCase()
  }));

// Quick access map for routing
export const menuItemsMap = allMenuItems.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
