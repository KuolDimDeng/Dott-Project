'use client';

import dynamic from 'next/dynamic';
import DashboardSkeleton from '@/components/loading/DashboardSkeleton';
import TableSkeleton from '@/components/loading/TableSkeleton';
import FormSkeleton from '@/components/loading/FormSkeleton';

console.log('🎯 [LazyDashboardComponents] Module loaded - all dashboard components will be lazy loaded');

// HR Components
export const EmployeeList = dynamic(
  () => import('./lists/EmployeeList'),
  { loading: () => <TableSkeleton rows={5} columns={6} />, ssr: false }
);

export const TimesheetManagement = dynamic(
  () => import('./forms/TimesheetManagement'),
  { loading: () => <TableSkeleton rows={7} columns={8} />, ssr: false }
);

export const PayrollWizard = dynamic(
  () => import('./forms/PayrollProcessingWizard'),
  { loading: () => <FormSkeleton fields={6} />, ssr: false }
);

// Sales Components
export const SalesDashboard = dynamic(
  () => import('./dashboards/SalesDashboardEnhanced'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const InvoiceList = dynamic(
  () => import('./lists/InvoiceList'),
  { loading: () => <TableSkeleton rows={5} columns={5} />, ssr: false }
);

export const QuotesList = dynamic(
  () => import('./lists/QuotesList'),
  { loading: () => <TableSkeleton rows={5} columns={5} />, ssr: false }
);

// Inventory Components
export const InventoryDashboard = dynamic(
  () => import('./dashboards/InventoryDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const ProductsList = dynamic(
  () => import('./lists/ProductsList'),
  { loading: () => <TableSkeleton rows={5} columns={6} />, ssr: false }
);

// Accounting Components
export const AccountingDashboard = dynamic(
  () => import('./dashboards/AccountingDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const ChartOfAccounts = dynamic(
  () => import('./forms/ChartOfAccounts'),
  { loading: () => <TableSkeleton rows={10} columns={4} />, ssr: false }
);

export const JournalEntries = dynamic(
  () => import('./forms/JournalEntries'),
  { loading: () => <TableSkeleton rows={5} columns={6} />, ssr: false }
);

// Tax Components
export const TaxDashboard = dynamic(
  () => import('./dashboards/TaxDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const TaxFilings = dynamic(
  () => import('./forms/TaxFilings'),
  { loading: () => <TableSkeleton rows={5} columns={5} />, ssr: false }
);

// Transport Components
export const TransportDashboard = dynamic(
  () => import('./dashboards/TransportDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// Banking Components
export const BankingDashboard = dynamic(
  () => import('./dashboards/BankingDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const BankReconciliation = dynamic(
  () => import('./forms/BankReconciliation'),
  { loading: () => <FormSkeleton fields={4} />, ssr: false }
);

// CRM Components
export const CRMDashboard = dynamic(
  () => import('./dashboards/CRMDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const CustomersList = dynamic(
  () => import('./lists/CustomersList'),
  { loading: () => <TableSkeleton rows={5} columns={5} />, ssr: false }
);

export const VendorsList = dynamic(
  () => import('./lists/VendorsList'),
  { loading: () => <TableSkeleton rows={5} columns={5} />, ssr: false }
);

// Jobs Components
export const JobsDashboard = dynamic(
  () => import('./dashboards/JobsDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const JobsList = dynamic(
  () => import('./lists/JobsList'),
  { loading: () => <TableSkeleton rows={5} columns={6} />, ssr: false }
);

// Analytics & AI Components
export const SmartInsights = dynamic(
  () => import('./forms/SmartInsight'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

export const AnalyticsDashboard = dynamic(
  () => import('./dashboards/AnalyticsDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// WhatsApp Components
export const WhatsAppBusinessDashboard = dynamic(
  () => import('./forms/WhatsAppBusinessDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// Import/Export Components
export const ImportExportDashboard = dynamic(
  () => import('./forms/ImportExportDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// POS Components
export const POSDashboard = dynamic(
  () => import('./dashboards/POSDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// Reports Components
export const ReportsDashboard = dynamic(
  () => import('./dashboards/ReportsDashboard'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);

// Main Business Overview Dashboard
export const BusinessOverviewDashboard = dynamic(
  () => {
    console.log('🎯 [LazyDashboardComponents] Loading BusinessOverviewDashboard component...');
    return import('./dashboards/BusinessOverviewDashboard').then(module => {
      console.log('✅ [LazyDashboardComponents] BusinessOverviewDashboard loaded successfully');
      return module;
    }).catch(err => {
      console.error('❌ [LazyDashboardComponents] Failed to load BusinessOverviewDashboard:', err);
      console.error('❌ [LazyDashboardComponents] Error message:', err.message);
      console.error('❌ [LazyDashboardComponents] Error stack:', err.stack);
      
      // Check if it's a TDZ error
      if (err.message && err.message.includes("can't access lexical declaration")) {
        console.error('🚨 [LazyDashboardComponents] TDZ ERROR DETECTED!');
        console.error('🚨 [LazyDashboardComponents] Variable name:', err.message.match(/'([^']+)'/)?.[1]);
        
        // Try loading the safe version as fallback
        console.log('🔄 [LazyDashboardComponents] Attempting to load safe version...');
        return import('./dashboards/BusinessOverviewDashboard-safe').then(safeModule => {
          console.log('✅ [LazyDashboardComponents] Safe version loaded successfully');
          return safeModule;
        });
      }
      
      // Re-throw for other errors
      throw err;
    });
  },
  { 
    loading: () => {
      console.log('🎯 [LazyDashboardComponents] Showing DashboardSkeleton while loading...');
      return <DashboardSkeleton />;
    }, 
    ssr: false 
  }
);