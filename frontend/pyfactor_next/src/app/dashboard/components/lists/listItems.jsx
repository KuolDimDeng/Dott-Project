import React, { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Paper,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

const MENU_WIDTH = 210;

const MainListItems = ({
  handleDashboardClick,
  handleSalesClick,
  handlePaymentsClick,
  handlePurchasesClick,
  handleAccountingClick,
  handleBankingClick,
  handlePayrollClick,
  handleInventoryClick,
  handleReportClick,
  handleAnalysisClick,
  handleTaxesClick,
}) => {
  const [openMenus, setOpenMenus] = useState({});

  const handleMenuToggle = (menuName) => {
    setOpenMenus(prevState => ({
      ...prevState,
      [menuName]: !prevState[menuName]
    }));
  };

  const renderSubMenu = (items, parentMenu) => (
    <Collapse in={openMenus[parentMenu]} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {items.map((item, index) => (
          <ListItemButton
            key={index}
            sx={{ pl: 4 }}
            onClick={() => item.onClick(item.value)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Collapse>
  );

  const menuItems = [
    {
      icon: <DashboardCustomizeIcon />,
      label: "Dashboard",
      onClick: handleDashboardClick
    },
    {
      icon: <PointOfSaleIcon />,
      label: "Sales",
      subItems: [
        { label: "Dashboard", onClick: handleSalesClick, value: 'dashboard' },
        { label: "Customers", onClick: handleSalesClick, value: 'customers' },
        { label: "Products", onClick: handleSalesClick, value: 'products' },
        { label: "Services", onClick: handleSalesClick, value: 'services' },
        { label: "Estimates", onClick: handleSalesClick, value: 'estimates' },
        { label: "Orders", onClick: handleSalesClick, value: 'orders' },
        { label: "Invoices", onClick: handleSalesClick, value: 'invoices' },
        { label: "Sales Team", onClick: handleSalesClick, value: 'sales-team' },
        { label: "Reports", onClick: handleSalesClick, value: 'reports' },
      ]
    },
    {
      icon: <PaymentsIcon />,
      label: "Payments",
      subItems: [
        { label: "Dashboard", onClick: handlePaymentsClick, value: 'dashboard' },
        { label: "Receive Payments", onClick: handlePaymentsClick, value: 'receive-payments' },
        { label: "Make Payments", onClick: handlePaymentsClick, value: 'make-payments' },
        { label: "Payment Methods", onClick: handlePaymentsClick, value: 'payment-methods' },
        { label: "Recurring Payments", onClick: handlePaymentsClick, value: 'recurring-payments' },
        { label: "Refunds", onClick: handlePaymentsClick, value: 'refunds' },
        { label: "Payment Reconciliation", onClick: handlePaymentsClick, value: 'reconciliation' },
        { label: "Payment Gateways", onClick: handlePaymentsClick, value: 'payment-gateways' },
        { label: "Payment Plans", onClick: handlePaymentsClick, value: 'payment-plans' },
        { label: "Reports", onClick: handlePaymentsClick, value: 'reports' },
      ]
    },
    // Add other menu items (Purchases, Accounting, Banking, Payroll, Inventory, Reports, Analytics, Taxes) similarly
      {
    icon: <ShoppingCartIcon />,
    label: "Purchases",
    subItems: [
      { label: "Dashboard", onClick: handlePurchasesClick, value: 'dashboard' },
      { label: "Vendors", onClick: handlePurchasesClick, value: 'vendors' },
      { label: "Purchase Orders", onClick: handlePurchasesClick, value: 'purchase-orders' },
      { label: "Bills", onClick: handlePurchasesClick, value: 'bills' },
      { label: "Expenses", onClick: handlePurchasesClick, value: 'expenses' },
      { label: "Purchase Returns", onClick: handlePurchasesClick, value: 'purchase-returns' },
      { label: "Procurement", onClick: handlePurchasesClick, value: 'procurement' },
      { label: "Reports", onClick: handlePurchasesClick, value: 'reports' },
    ]
  },
  {
    icon: <AccountBalanceIcon />,
    label: "Accounting",
    subItems: [
      { label: "Dashboard", onClick: handleAccountingClick, value: 'dashboard' },
      { label: "Chart of Accounts", onClick: handleAccountingClick, value: 'chart-of-accounts' },
      { label: "Journal Entries", onClick: handleAccountingClick, value: 'journal-entries' },
      { label: "General Ledger", onClick: handleAccountingClick, value: 'general-ledger' },
      { label: "Reconciliation", onClick: handleAccountingClick, value: 'reconciliation' },
      { label: "Financial Statements", onClick: handleAccountingClick, value: 'financial-statements' },
      { label: "Fixed Assets", onClick: handleAccountingClick, value: 'fixed-assets' },
      { label: "Reports", onClick: handleAccountingClick, value: 'reports' },
    ]
  },
  {
    icon: <AccountBalanceWalletIcon />,
    label: "Banking",
    subItems: [
      { label: "Dashboard", onClick: handleBankingClick, value: 'dashboard' },
      { label: "Bank Accounts", onClick: handleBankingClick, value: 'bank-accounts' },
      { label: "Transactions", onClick: handleBankingClick, value: 'transactions' },
      { label: "Transfers", onClick: handleBankingClick, value: 'transfers' },
      { label: "Reconciliation", onClick: handleBankingClick, value: 'reconciliation' },
      { label: "Reports", onClick: handleBankingClick, value: 'reports' },
    ]
  },
  {
    icon: <PaymentsIcon />,
    label: "Payroll",
    subItems: [
      { label: "Dashboard", onClick: handlePayrollClick, value: 'dashboard' },
      { label: "Employees", onClick: handlePayrollClick, value: 'employees' },
      { label: "Timesheets", onClick: handlePayrollClick, value: 'timesheets' },
      { label: "Payrun", onClick: handlePayrollClick, value: 'payrun' },
      { label: "Taxes", onClick: handlePayrollClick, value: 'taxes' },
      { label: "Benefits", onClick: handlePayrollClick, value: 'benefits' },
      { label: "Reports", onClick: handlePayrollClick, value: 'reports' },
    ]
  },
  {
    icon: <Inventory2OutlinedIcon />,
    label: "Inventory",
    subItems: [
      { label: "Dashboard", onClick: handleInventoryClick, value: 'dashboard' },
      { label: "Items", onClick: handleInventoryClick, value: 'items' },
      { label: "Stock Adjustments", onClick: handleInventoryClick, value: 'stock-adjustments' },
      { label: "Transfers", onClick: handleInventoryClick, value: 'transfers' },
      { label: "Warehouses", onClick: handleInventoryClick, value: 'warehouses' },
      { label: "Reports", onClick: handleInventoryClick, value: 'reports' },
    ]
  },
  {
    icon: <AssessmentIcon />,
    label: "Reports",
    subItems: [
      { label: "Financial", onClick: handleReportClick, value: 'financial' },
      { label: "Sales", onClick: handleReportClick, value: 'sales' },
      { label: "Purchases", onClick: handleReportClick, value: 'purchases' },
      { label: "Inventory", onClick: handleReportClick, value: 'inventory' },
      { label: "Payroll", onClick: handleReportClick, value: 'payroll' },
      { label: "Taxes", onClick: handleReportClick, value: 'taxes' },
      { label: "Custom Reports", onClick: handleReportClick, value: 'custom' },
    ]
  },
  {
    icon: <AnalyticsIcon />,
    label: "Analytics",
    subItems: [
      { label: "Dashboard", onClick: handleAnalysisClick, value: 'dashboard' },
      { label: "Sales Analysis", onClick: handleAnalysisClick, value: 'sales' },
      { label: "Expense Analysis", onClick: handleAnalysisClick, value: 'expenses' },
      { label: "Profit & Loss", onClick: handleAnalysisClick, value: 'profit-loss' },
      { label: "Cash Flow", onClick: handleAnalysisClick, value: 'cash-flow' },
      { label: "Budget vs. Actual", onClick: handleAnalysisClick, value: 'budget-vs-actual' },
      { label: "KPI Dashboard", onClick: handleAnalysisClick, value: 'kpi' },
    ]
  },
  {
    icon: <ReceiptLongIcon />,
    label: "Taxes",
    subItems: [
      { label: "Dashboard", onClick: handleTaxesClick, value: 'dashboard' },
      { label: "Sales Tax", onClick: handleTaxesClick, value: 'sales-tax' },
      { label: "Income Tax", onClick: handleTaxesClick, value: 'income-tax' },
      { label: "Payroll Tax", onClick: handleTaxesClick, value: 'payroll-tax' },
      { label: "Tax Payments", onClick: handleTaxesClick, value: 'tax-payments' },
      { label: "Tax Forms", onClick: handleTaxesClick, value: 'tax-forms' },
      { label: "Reports", onClick: handleTaxesClick, value: 'reports' },
    ]
  },
  ];

  return (
    <Paper 
      elevation={0}
      sx={{ 
        width: MENU_WIDTH, 
        height: '100vh', 
        background: 'linear-gradient(to bottom, #e3f2fd, #ffffff)',
      }}
    >
      <Box sx={{ overflow: 'auto', height: '100%' }}>
        <List component="nav" aria-label="main mailbox folders">
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              <ListItemButton
                onClick={() => item.subItems ? handleMenuToggle(item.label) : item.onClick()}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
                {item.subItems && (openMenus[item.label] ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              {item.subItems && renderSubMenu(item.subItems, item.label)}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default MainListItems;