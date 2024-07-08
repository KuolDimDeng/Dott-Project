// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/RenderMainContent.jsx

import React from 'react';
import CustomerList from './lists/CustomerList';
import Grid from '@mui/material/Grid';
import { useState, useCallback, useEffect } from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CssBaseline from '@mui/material/CssBaseline';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Chart from '../Chart';
import Deposits from '../Deposits';
import Orders from '../Orders';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import DateTime from './components/DateTime.jsx';
import ConsoleMessages from './components/ConsoleMessages.jsx';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import InvoiceTemplateBuilder from './forms/InvoiceTemplateBuilder';
import ProductForm from './forms/ProductForm';
import ServiceForm from './forms/ServiceForm';
import CustomerForm from './forms/CustomerForm';
import BillForm from './forms/BillForm';
import InvoiceForm from './forms/InvoiceForm';
import VendorForm from './forms/VendorForm';
import EstimateForm from './forms/EstimateForm';
import SalesOrderForm from './forms/SalesOrderForm';
import TransactionForm from './forms/TransactionForm';
import TransactionList from './lists/TransactionList';
import ReportDisplay from './forms/ReportDisplay';
import MenuIcon from '@mui/icons-material/Menu';
import BankingDashboard from './forms/BankingDashboard';
import Reports from './components/Reports';
import Chatbot from './forms/ChatBot.jsx';
import InvoiceDetails from './forms/InvoiceDetails';
import CustomerDetails from './forms/CustomerDetails';
//import BankingDashboard from './forms/BankingDashboard';
//import HRDashboard from './forms/HRDashboard';
//import PayrollDashboard from './forms/PayrollDashboard';
import AnalysisPage from './forms/AnalysisPage';
//import AccountPage from './forms/AccountPage';
//import ReportPage from './forms/ReportPage';
import renderForm from './RenderForm';
import ProductManagement from './forms/ProductManagement';
import ServiceManagement from './forms/ServiceManagement';
import ChartContainer from '@/app/chart/component/ChartContainer';
import IntegrationSettings from './components/IntegrationSettings';



const RenderMainContent = ({
  showTransactionForm,
  showInvoiceBuilder,
  showCreateOptions,
  selectedOption,
  userData,
  handleCloseInvoiceBuilder,
  showAccountPage,
  handleDeleteAccount,
  selectedReport,
  showReports,
  showBankingDashboard,
  showHRDashboard,
  hrSection,
  showPayrollDashboard,
  payrollSection,
  showAnalysisPage,
  showCustomerList,
  handleCreateCustomer,
  selectedInvoiceId,
  handleInvoiceSelect,
  handleBackFromInvoice,
  showCustomerDetails,
  selectedCustomer,
  handleCustomerSelect,
  handleBackToCustomerDetails,
  showProductManagement,
  showServiceManagement,
  showDashboard,
  showIntegrationSettings,
}) => {
  if (showIntegrationSettings) return null;
  
  if (showCreateOptions && selectedOption === 'Estimate') {
    return (
      <EstimateForm
        onSave={(estimateData) => {
          console.log('Saving estimate:', estimateData);
        }}
        onPreview={(estimateData) => {
          console.log('Previewing estimate:', estimateData);
        }}
      />
    );
  }

  if (showDashboard) {
    return <Typography variant="h4" component="h1" gutterBottom>This is the dashboard area</Typography>;
  }

  if (showProductManagement) {
    return <ProductManagement />;
  }

  if (showServiceManagement) {
    return <ServiceManagement />;
  }

  if (selectedInvoiceId !== null) {
    return <InvoiceDetails invoiceId={selectedInvoiceId} onBack={handleBackToCustomerDetails} />;
  }

  if (showCustomerDetails && selectedCustomer) {
    return <CustomerDetails customer={selectedCustomer} onInvoiceSelect={handleInvoiceSelect} onBack={handleBackFromInvoice} />;
  }

  if (showAnalysisPage) {
    return <AnalysisPage />;
  }

  if (showCustomerList) {
    return (
      <CustomerList 
        onCreateCustomer={handleCreateCustomer} 
        onInvoiceSelect={handleInvoiceSelect}
        onCustomerSelect={handleCustomerSelect}
      />
    );
  }

  if (showReports && selectedReport) {
    return <ReportDisplay reportType={selectedReport} />;
  }

  if (showBankingDashboard) {
    return <BankingDashboard />;
  }

  if (showHRDashboard) {
    return <HRDashboard section={hrSection} />;
  }

  if (showPayrollDashboard) {
    return <PayrollDashboard section={payrollSection} />;
  }

  if (showAccountPage) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Button variant="contained" color="error" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </Grid>
      </Grid>
    );
  }

  if (showTransactionForm) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TransactionForm />
        </Grid>
        <Grid item xs={12}>
          <TransactionList />
        </Grid>
      </Grid>
    );
  }

  if (showInvoiceBuilder) {
    return (
      <InvoiceTemplateBuilder
        handleClose={handleCloseInvoiceBuilder}
        userData={userData}
      />
    );
  }

  if (showCreateOptions) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderForm(selectedOption, userData)}
        </Grid>
      </Grid>
    );
  }

  return null;
};

export default RenderMainContent;
