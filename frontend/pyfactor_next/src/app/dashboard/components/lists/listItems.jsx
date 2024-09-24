import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { Menu, MenuItem, Box } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BarChartIcon from '@mui/icons-material/BarChart';


import MenuIcon from '@mui/icons-material/Menu'; 
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
const MENU_WIDTH = 210; // Adjust this value to change the menu width

const SUBMENU_LEFT_POSITION = MENU_WIDTH; // Adjust this offset as needed


const navyBlue = '#000080';
const myColor = '#1565c0';
const lightGrey = '#bdbdbd';
const blue = '#2196f3';
const textColor = '#1a237e';
const iconColor = '#1e88e5';

const listItemStyle = {
  border: 'none',
  '&::after': {
    display: 'none',
  },
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.04)', // Light navy blue on hover
  },
  '&.Mui-selected': {
    backgroundColor: 'rgba(0, 0, 128, 0.08)', // Darker shade of grey when selected
  },
  '&.Mui-selected:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.12)', // Even darker shade when selected and hovered
  },
};

const mainMenuItemStyle = {
  // Add the desired styles for the main menu items here
  // For example:
  backgroundColor: 'rgba(0, 0, 128, 0.04)', // Light navy blue background
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.08)', // Slightly darker hover color
  },
};

const menuItemStyle = {
  color: textColor, // Default text color
  transition: 'all 0.2s ease', // Fast transition for all properties
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.12)', // Darker shade of grey when selected
    color: textColor, // Darker text color when hovered
  },
};

export const MainListItems = ({ 
  showInvoiceBuilder, 
  hideInvoiceBuilder, 
  showCreateOptions, 
  showTransactionForm, 
  handleReportClick,
  drawerOpen,
  handleDrawerToggle,
  handleBankingClick,
  handleHRClick,
  handlePayrollClick,
  handleAnalysisClick,
  handleAccountingClick,
  handlePaymentsClick,
  handleTaxesClick,
  showCustomerList,
  setShowCustomerList,
  handleCreateCustomer,
  handleSalesClick,
  handleChartClick,
  handleDashboardClick,
  handlePurchasesClick,
}) => {   
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = React.useState(false);
  const [showReportsMenu, setShowReportsMenu] = React.useState(false);
  const [createAnchorEl, setCreateAnchorEl] = React.useState(null);
  const [reportsAnchorEl, setReportsAnchorEl] = React.useState(null);
  const [bankingAnchorEl, setBankingAnchorEl] = React.useState(null);
  const [hrAnchorEl, setHrAnchorEl] = React.useState(null);
  const [payrollAnchorEl, setPayrollAnchorEl] = React.useState(null);
  const [accountingAnchorEl, setAccountingAnchorEl] = React.useState(null);
  const [salesAnchorEl, setSalesAnchorEl] = React.useState(null);
  const [paymentsAnchorEl, setPaymentsAnchorEl] = React.useState(null);
  const [analysisAnchorEl, setAnalysisAnchorEl] = React.useState(null);
  const [taxesAnchorEl, setTaxesAnchorEl] = React.useState(null);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [purchasesAnchorEl, setPurchasesAnchorEl] = React.useState(null);
  const [chartAnchorEl, setChartAnchorEl] = React.useState(null);
    
  const handlePurchasesMenuOpen = (event) => {
    setPurchasesAnchorEl(event.currentTarget);
  };
  
  const handlePurchasesMenuClose = () => {
    setPurchasesAnchorEl(null);
  };
  
  const handleAnalysisMenuOpen = (event) => {
    setAnalysisAnchorEl(event.currentTarget);
  };
  
  const handleAnalysisMenuClose = () => {
    setAnalysisAnchorEl(null);
  };

  const handleTaxesMenuOpen = (event) => {
    setTaxesAnchorEl(event.currentTarget);
  };
  
  const handleTaxesMenuClose = () => {
    setTaxesAnchorEl(null);
  };


  
  const handleSalesMenuOpen = (event) => {
    setSalesAnchorEl(event.currentTarget);
  };
  
  const handleSalesMenuClose = () => {
    setSalesAnchorEl(null);
  };

  const handlePaymentsMenuOpen = (event) => {
    setPaymentsAnchorEl(event.currentTarget);
  };
  
  const handlePaymentsMenuClose = () => {
    setPaymentsAnchorEl(null);
  };
  
  const handleAccountingMenuOpen = (event) => {
    setAccountingAnchorEl(event.currentTarget);
  };
  
  const handleAccountingMenuClose = () => {
    setAccountingAnchorEl(null);
  };

  const handleBankingMenuOpen = (event) => {
    setBankingAnchorEl(event.currentTarget);
  };

  const handleBankingMenuClose = () => {
    setBankingAnchorEl(null);
  };

  const handleHRMenuOpen = (event) => {
    setHrAnchorEl(event.currentTarget);
  };

  const handleHRMenuClose = () => {
    setHrAnchorEl(null);
  };

  const handlePayrollMenuOpen = (event) => {
    setPayrollAnchorEl(event.currentTarget);
  };

  const handlePayrollMenuClose = () => {
    setPayrollAnchorEl(null);
  };


  
  const handleCreateOptionsMenuOpen = (event) => {
    setCreateAnchorEl(event.currentTarget);
    setShowCreateOptionsMenu(true);
  };

  const handleCreateOptionsMenuClose = () => {
    setCreateAnchorEl(null);
    setShowCreateOptionsMenu(false);
  };

  const handleCreateOptionsSelect = (option) => {
    if (option === 'Transaction') {
      showTransactionForm();
    } else {
      showCreateOptions(option);
    }
    handleCreateOptionsMenuClose();
  };

  const handleReportsMenuOpen = (event) => {
    setReportsAnchorEl(event.currentTarget);
    setShowReportsMenu(true);
  };

  const handleReportsMenuClose = () => {
    setReportsAnchorEl(null);
    setShowReportsMenu(false);
  };

  const handleReportSelect = (reportType) => {
    handleReportClick(reportType);
    handleReportsMenuClose();
  };

  const handleSalesMenuItemClick = (section) => {
    console.log('handle sales menu item called.', section);
    if (section === 'customers') {
      setShowCustomerList(true);
    }
    // Call the prop function to update the parent component
    if (typeof handleSalesClick === 'function') {
      handleSalesClick(section);
    } else {
      console.error('handleSalesClick is not a function');
    }
  };

  //const handleCreateCustomer = () => {
 //  setShowCreateOptions(true);
 //   setSelectedOption('Customer');
  //  setShowCustomerList(false);
 // };

 return (
  <Paper 
    elevation={3} 
    sx={{ 
      p: 2, 
      my: 2, 
      width: MENU_WIDTH, 
      height: '100vh', 
      background: 'linear-gradient(to bottom, #e3f2fd, #ffffff)', // Light blue to white gradient
    }}
  >
   <Box 
    sx={{ 
      height: '100%', // Full height
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between', // Optional: Space items evenly
      backgroundColor: 'transparent', // Make Box background transparent
      '& .MuiListItemButton-root': {
        ...listItemStyle,
        paddingLeft: 2,
        paddingRight: 2,
        backgroundColor: 'transparent', // Make Box background transparent
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 128, 0.15)', // Darker navy blue on hover
                  },
      },
      '& .MuiListItemButton-root:last-child': {
        marginBottom: 0,
      },
    }}>
      <List disablePadding>
       
        
        {drawerOpen && (
            <>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('create');
                  handleCreateOptionsMenuOpen(event);
                }}
                selected={selectedItem === 'create'}
              >
                <ListItemIcon>
                  <AddCircleOutlineIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary={<b>Create new</b>} sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton
                onClick={() => {setSelectedItem('dashboard'); handleDashboardClick();}}
                selected={selectedItem === 'dashboard'}
              >
                <ListItemIcon>
                  <DashboardCustomizeIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Dashboard" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('sales');
                  handleSalesMenuOpen(event);
                }}
                selected={selectedItem === 'sales'}
              >
                <ListItemIcon>
                  <PointOfSaleIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Sales" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('payments');
                  handlePaymentsMenuOpen(event);
                }}
                selected={selectedItem === 'payments'}
              >
                <ListItemIcon>
                  <PaymentsIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Payments" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton
                onClick={(event) => {setSelectedItem('purchases');
                  handlePurchasesMenuOpen(event);
                }}
                selected={selectedItem === 'purchases'}
              >
                <ListItemIcon>
                  <ShoppingCartIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Purchases" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('accounting');
                  handleAccountingMenuOpen(event);
                }}
                selected={selectedItem === 'accounting'}
              >
                <ListItemIcon>
                  <AccountBalanceIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Accounting" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('banking');
                  handleBankingMenuOpen(event);
                }}
                selected={selectedItem === 'banking'}
              >
                <ListItemIcon>
                  <AccountBalanceWalletIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Banking" sx={{ color: textColor }} />
              </ListItemButton>
             
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('payroll');
                  handlePayrollMenuOpen(event);
                }}
                selected={selectedItem === 'payroll'}
              >
                <ListItemIcon>
                  <PaymentsIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Payroll" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('reports');
                  handleReportsMenuOpen(event);
                }}
                selected={selectedItem === 'reports'}
              >
                <ListItemIcon>
                  <AssessmentIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Reports" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('analysis');
                  handleAnalysisMenuOpen(event);
                }}
                selected={selectedItem === 'analysis'}
              >
                <ListItemIcon>
                  <AnalyticsIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Analytics" sx={{ color: textColor }} />
              </ListItemButton>
              <ListItemButton 
                onClick={(event) => {
                  setSelectedItem('taxes');
                  handleTaxesMenuOpen(event);
                }}
                selected={selectedItem === 'taxes'}
              >
                <ListItemIcon>
                  <ReceiptLongIcon style={{ color: iconColor }} />
                </ListItemIcon>
                <ListItemText primary="Taxes" sx={{ color: textColor }} />
              </ListItemButton>
            </>
          )}
      </List>
      <Menu
          anchorEl={createAnchorEl}
          open={showCreateOptionsMenu}
          onClose={handleCreateOptionsMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: createAnchorEl ? createAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleCreateOptionsSelect('Transaction')} sx={menuItemStyle}>Transaction</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Product')} sx={menuItemStyle}>Product</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Service')} sx={menuItemStyle}>Service</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Customer')} sx={menuItemStyle}>Customer</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Bill')} sx={menuItemStyle}>Bill</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Invoice')} sx={menuItemStyle}>Invoice</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Vendor')} sx={menuItemStyle}>Vendor</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Estimate')} sx={menuItemStyle}>Estimate</MenuItem>
          <MenuItem onClick={() => handleCreateOptionsSelect('Sales Order')} sx={menuItemStyle}>Sales Order</MenuItem>
        </Menu>
        <Menu
          anchorEl={reportsAnchorEl}
          open={showReportsMenu}
          onClose={handleReportsMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: reportsAnchorEl ? reportsAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleReportSelect('income_statement')} sx={menuItemStyle}>Profit & Loss (Income Statement)</MenuItem>
          <MenuItem onClick={() => handleReportSelect('balance_sheet')} sx={menuItemStyle}>Balance Sheet</MenuItem>
          <MenuItem onClick={() => handleReportSelect('cash_flow')} sx={menuItemStyle}>Cash Flow</MenuItem>
          <MenuItem onClick={() => handleReportSelect('sales_tax_report')} sx={menuItemStyle}>Sales Tax Report</MenuItem>
          <MenuItem onClick={() => handleReportSelect('payroll_wage_tax_report')} sx={menuItemStyle}>Payroll Wage & Tax Report</MenuItem>
          <MenuItem onClick={() => handleReportSelect('income_by_customer')} sx={menuItemStyle}>Income by Customer</MenuItem>
          <MenuItem onClick={() => handleReportSelect('aged_receivables')} sx={menuItemStyle}>Aged Receivables</MenuItem>
          <MenuItem onClick={() => handleReportSelect('purchases_by_vendor')} sx={menuItemStyle}>Purchases by Vendor</MenuItem>
          <MenuItem onClick={() => handleReportSelect('aged_payables')} sx={menuItemStyle}>Aged Payables</MenuItem>
          <MenuItem onClick={() => handleReportSelect('account_balances')} sx={menuItemStyle}>Account Balances</MenuItem>
          <MenuItem onClick={() => handleReportSelect('trial_balance')} sx={menuItemStyle}>Trial Balance</MenuItem>
          <MenuItem onClick={() => handleReportSelect('general_ledger')} sx={menuItemStyle}>General Ledger (Account Transactions)</MenuItem>
        </Menu>
        <Menu
          anchorEl={bankingAnchorEl}
          open={Boolean(bankingAnchorEl)}
          onClose={handleBankingMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: bankingAnchorEl ? bankingAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleBankingClick('dashboard')} sx={menuItemStyle}>Banking Dashboard</MenuItem>
          <MenuItem onClick={() => handleBankingClick('connect')} sx={menuItemStyle}>Connect Bank</MenuItem>
          <MenuItem onClick={() => handleBankingClick('reconciliation')} sx={menuItemStyle}>Bank Reconciliation</MenuItem>
          <MenuItem onClick={() => handleBankingClick('bank-balances')} sx={menuItemStyle}>Bank Balances</MenuItem>
           <MenuItem onClick={() => handleBankingClick('bank-reports')} sx={menuItemStyle}>Banking Reports</MenuItem>
        </Menu>
        <Menu
          anchorEl={hrAnchorEl}
          open={Boolean(hrAnchorEl)}
          onClose={handleHRMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: hrAnchorEl ? hrAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleHRClick('time-attendance')} sx={menuItemStyle}>Time and Attendance</MenuItem>
          <MenuItem onClick={() => handleHRClick('benefits')} sx={menuItemStyle}>Benefits Administration</MenuItem>
          <MenuItem onClick={() => handleHRClick('employee-relations')} sx={menuItemStyle}>Employee Relations</MenuItem>
          <MenuItem onClick={() => handleHRClick('hr-reports')} sx={menuItemStyle}>Reporting and Analytics</MenuItem>
        </Menu>
        <Menu
          anchorEl={payrollAnchorEl}
          open={Boolean(payrollAnchorEl)}
          onClose={handlePayrollMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: payrollAnchorEl ? payrollAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handlePayrollClick('employees')} sx={menuItemStyle}>Employees</MenuItem>
          <MenuItem onClick={() => handlePayrollClick('run')} sx={menuItemStyle}>Run Payroll</MenuItem>
          <MenuItem onClick={() => handlePayrollClick('timesheets')} sx={menuItemStyle}>Timesheets</MenuItem>
          <MenuItem onClick={() => handlePayrollClick('transactions')} sx={menuItemStyle}>Payroll Transactions</MenuItem>
          <MenuItem onClick={() => handlePayrollClick('taxes')} sx={menuItemStyle}>Taxes</MenuItem>
          <MenuItem onClick={() => handlePayrollClick('taxForms')} sx={menuItemStyle}>Tax Forms</MenuItem>
          <MenuItem onClick={() => handlePayrollClick('payroll-reports')} sx={menuItemStyle}>Payroll Reports</MenuItem>
        </Menu>
        <Menu
          anchorEl={accountingAnchorEl}
          open={Boolean(accountingAnchorEl)}
          onClose={handleAccountingMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: accountingAnchorEl ? accountingAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleAccountingClick('dashboard')} sx={menuItemStyle}>Dashboard</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('chart-of-accounts')} sx={menuItemStyle}>Chart of Accounts</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('journal-entries')} sx={menuItemStyle}>Journal Entries</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('general-ledger')} sx={menuItemStyle}>General Ledger</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('reconciliation')} sx={menuItemStyle}>Account Reconciliation</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('month-end-closing')} sx={menuItemStyle}>Month-End Closing</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('financial-statements')} sx={menuItemStyle}>Financial Statements</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('fixed-assets')} sx={menuItemStyle}>Fixed Assets</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('budgeting')} sx={menuItemStyle}>Budgeting</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('cost-accounting')} sx={menuItemStyle}>Cost Accounting</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('intercompany-transactions')} sx={menuItemStyle}>Intercompany Transactions</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('audit-trail')} sx={menuItemStyle}>Audit Trail</MenuItem>
          <MenuItem onClick={() => handleAccountingClick('accounting-reports')} sx={menuItemStyle}>Accounting Reports</MenuItem>
        </Menu>
        <Menu
          anchorEl={salesAnchorEl}
          open={Boolean(salesAnchorEl)}
          onClose={handleSalesMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: salesAnchorEl ? salesAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleSalesMenuItemClick('dashboard')} sx={menuItemStyle}>Dashboard</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('customers')} sx={menuItemStyle}>Customers</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('products')} sx={menuItemStyle}>Products</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('services')} sx={menuItemStyle}>Services</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('estimates')} sx={menuItemStyle}>Estimates</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('orders')} sx={menuItemStyle}>Orders</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('invoices')} sx={menuItemStyle}>Invoices</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('sales-team')} sx={menuItemStyle}>Sales Team</MenuItem>
          <MenuItem onClick={() => handleSalesMenuItemClick('reports')} sx={menuItemStyle}>Reports</MenuItem>
        </Menu>
        <Menu
          anchorEl={paymentsAnchorEl}
          open={Boolean(paymentsAnchorEl)}
          onClose={handlePaymentsMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: paymentsAnchorEl ? paymentsAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handlePaymentsClick('dashboard')} sx={menuItemStyle}>Dashboard</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('receive-payments')} sx={menuItemStyle}>Receive Payments</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('make-payments')} sx={menuItemStyle}>Make Payments</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('payment-methods')} sx={menuItemStyle}>Payment Methods</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('recurring-payments')} sx={menuItemStyle}>Recurring Payments</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('refunds')} sx={menuItemStyle}>Refunds</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('reconciliation')} sx={menuItemStyle}>Payment Reconciliation</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('payment-gateways')} sx={menuItemStyle}>Payment Gateways</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('payment-plans')} sx={menuItemStyle}>Payment Plans</MenuItem>
          <MenuItem onClick={() => handlePaymentsClick('reports')} sx={menuItemStyle}>Reports</MenuItem>
        </Menu>
        <Menu
          anchorEl={analysisAnchorEl}
          open={Boolean(analysisAnchorEl)}
          onClose={handleAnalysisMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: analysisAnchorEl ? analysisAnchorEl.getBoundingClientRect().top : 0}}
        >
          <MenuItem onClick={() => handleAnalysisClick('financial-overview')} sx={menuItemStyle}>Financial Overview</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('profit-loss-analysis')} sx={menuItemStyle}>Profit & Loss Analysis</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('balance-sheet')} sx={menuItemStyle}>Balance Sheet Analysis</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('cash-flow')} sx={menuItemStyle}>Cash Flow Analysis</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('budget-vs-actual')} sx={menuItemStyle}>Budget vs. Actual</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('sales-analysis')} sx={menuItemStyle}>Sales Analysis</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('expense-analysis')} sx={menuItemStyle}>Expense Analysis</MenuItem>
          <MenuItem onClick={() => handleAnalysisClick('kpi-data')} sx={menuItemStyle}>KPI Dashboard</MenuItem>
        </Menu>
        <Menu
          anchorEl={taxesAnchorEl}
          open={Boolean(taxesAnchorEl)}
          onClose={handleTaxesMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          anchorReference="anchorPosition"
          anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: taxesAnchorEl ? taxesAnchorEl.getBoundingClientRect().top : 0}}
          >
            <MenuItem onClick={() => handleTaxesClick('tax-dashboard')} sx={menuItemStyle}>Tax Dashboard</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('sales-tax')} sx={menuItemStyle}>Sales Tax</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('income-tax')} sx={menuItemStyle}>Income Tax</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('payroll-tax')} sx={menuItemStyle}>Payroll Tax</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('tax-payments')} sx={menuItemStyle}>Tax Payments</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('tax-forms')} sx={menuItemStyle}>Tax Forms</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('tax-calendar')} sx={menuItemStyle}>Tax Calendar</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('tax-settings')} sx={menuItemStyle}>Tax Settings</MenuItem>
            <MenuItem onClick={() => handleTaxesClick('tax-reports')} sx={menuItemStyle}>Tax Reports</MenuItem>
          </Menu>
          <Menu
            anchorEl={purchasesAnchorEl}
            open={Boolean(purchasesAnchorEl)}
            onClose={handlePurchasesMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            anchorReference="anchorPosition"
            anchorPosition={{ left: SUBMENU_LEFT_POSITION, top: purchasesAnchorEl ? purchasesAnchorEl.getBoundingClientRect().top : 0}}
          >
            <MenuItem onClick={() => handlePurchasesClick('dashboard')} sx={menuItemStyle}>Dashboard</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('vendors')} sx={menuItemStyle}>Vendors</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('purchase-orders')} sx={menuItemStyle}>Purchase Orders</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('bills')} sx={menuItemStyle}>Bills</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('expenses')} sx={menuItemStyle}>Expenses</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('purchase-returns')} sx={menuItemStyle}>Purchase Returns</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('procurement')} sx={menuItemStyle}>Procurement</MenuItem>
            <MenuItem onClick={() => handlePurchasesClick('reports')} sx={menuItemStyle}>Reports</MenuItem>
          </Menu>
        </Box>
      </Paper>
    );
  };
  
  export default MainListItems;