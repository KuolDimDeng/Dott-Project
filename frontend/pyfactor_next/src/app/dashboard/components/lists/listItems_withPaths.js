// Menu item path definitions
export const menuItemPaths = {
  sales: {
    dashboard: '/dashboard/sales',
    products: '/dashboard/products',
    services: '/dashboard/services', 
    customers: '/dashboard/customers',
    estimates: '/dashboard/quotes',
    orders: '/dashboard/sales-orders',
    invoices: '/dashboard/invoices',
    reports: '/dashboard/sales-reports'
  },
  inventory: {
    dashboard: '/dashboard/inventory',
    stockAdjustments: '/dashboard/inventory/adjustments',
    locations: '/dashboard/inventory/locations',
    suppliers: '/dashboard/inventory/suppliers',
    reports: '/dashboard/inventory/reports'
  },
  payments: {
    dashboard: '/dashboard/payments',
    receivePayments: '/dashboard/payments/receive',
    makePayments: '/dashboard/payments/make',
    paymentMethods: '/dashboard/payment-methods',
    recurringPayments: '/dashboard/payments/recurring',
    refunds: '/dashboard/payments/refunds',
    reconciliation: '/dashboard/payments/reconciliation',
    gateways: '/dashboard/payment-gateways',
    plans: '/dashboard/payment-plans',
    reports: '/dashboard/payment-reports'
  },
  purchases: {
    dashboard: '/dashboard/purchases',
    vendors: '/dashboard/vendors',
    purchaseOrders: '/dashboard/purchase-orders',
    bills: '/dashboard/bills',
    expenses: '/dashboard/expenses',
    returns: '/dashboard/purchase-returns',
    procurement: '/dashboard/procurement',
    reports: '/dashboard/purchase-reports'
  },
  accounting: {
    dashboard: '/dashboard/accounting',
    chartOfAccounts: '/dashboard/chart-of-accounts',
    journalEntries: '/dashboard/journal-entries',
    generalLedger: '/dashboard/general-ledger',
    reconciliation: '/dashboard/reconciliation',
    financialStatements: '/dashboard/financial-statements',
    fixedAssets: '/dashboard/fixed-assets',
    reports: '/dashboard/accounting-reports'
  },
  banking: {
    dashboard: '/dashboard/banking',
    connect: '/dashboard/banking/connect',
    transactions: '/dashboard/banking/transactions',
    reconciliation: '/dashboard/banking/reconciliation',
    reports: '/dashboard/banking/reports'
  },
  hr: {
    dashboard: '/dashboard/hr',
    employees: '/dashboard/employees',
    timesheets: '/dashboard/timesheets',
    pay: '/dashboard/pay',
    benefits: '/dashboard/benefits',
    reports: '/dashboard/hr-reports',
    performance: '/dashboard/performance'
  },
  payroll: {
    dashboard: '/dashboard/payroll',
    runPayroll: '/dashboard/payroll/run',
    transactions: '/dashboard/payroll/transactions',
    reports: '/dashboard/payroll/reports'
  },
  taxes: {
    dashboard: '/dashboard/taxes',
    salesTax: '/dashboard/taxes/sales',
    incomeTax: '/dashboard/taxes/income',
    payrollTax: '/dashboard/taxes/payroll',
    payments: '/dashboard/taxes/payments',
    forms: '/dashboard/taxes/forms',
    reports: '/dashboard/taxes/reports'
  },
  reports: {
    dashboard: '/dashboard/reports',
    profitLoss: '/dashboard/reports/profit-loss',
    balanceSheet: '/dashboard/reports/balance-sheet',
    cashFlow: '/dashboard/reports/cash-flow',
    salesTax: '/dashboard/reports/sales-tax',
    payrollWageTax: '/dashboard/reports/payroll-wage-tax',
    incomeByCustomer: '/dashboard/reports/income-by-customer',
    agedReceivables: '/dashboard/reports/aged-receivables',
    purchasesByVendor: '/dashboard/reports/purchases-by-vendor',
    agedPayables: '/dashboard/reports/aged-payables',
    accountBalances: '/dashboard/reports/account-balances',
    trialBalance: '/dashboard/reports/trial-balance',
    generalLedger: '/dashboard/reports/general-ledger'
  },
  analytics: {
    dashboard: '/dashboard/analytics',
    aiQuery: '/dashboard/analytics/ai-query'
  }
};