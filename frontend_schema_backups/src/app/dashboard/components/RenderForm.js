'use client';

import React from 'react';
import ProductManagement from './forms/ProductManagement';
import ServiceForm from './forms/ServiceForm';
import { logger } from '@/utils/logger';
import CustomerForm from './forms/CustomerForm';
import BillForm from './forms/BillForm';
import InvoiceForm from './forms/InvoiceForm';
import VendorForm from './forms/VendorForm';
import EstimateForm from './forms/EstimateForm';
import SalesOrderForm from './forms/SalesOrderForm';
import TransactionForm from '../../createNew/forms/TransactionForm.js';

const renderForm = (option, userData) => {
  switch (option) {
    case 'Transaction':
      return <TransactionForm />;
    case 'Product':
      return <ProductManagement isNewProduct={true} />;
    case 'Service':
      return <ServiceForm />;
    case 'Customer':
      return <CustomerForm />;
    case 'Bill':
      return <BillForm />;
    case 'Invoice':
      return <InvoiceForm />;
    case 'Vendor':
      return <VendorForm />;
    case 'Estimate':
      return <EstimateForm userData={userData} />;
    case 'Sales Order':
      return <SalesOrderForm />;
    default:
      return null;
  }
};

export default renderForm;
