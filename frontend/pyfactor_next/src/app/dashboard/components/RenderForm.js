'use client';


import React from 'react';
import { logger } from '@/utils/logger';
import BillForm from './forms/BillForm';
import CustomerForm from './forms/CustomerForm';
import EstimateForm from './forms/EstimateForm';
import InvoiceForm from './forms/InvoiceForm';
import ServiceManagement from './forms/ServiceManagement';
import ProductManagement from './forms/ProductManagement';
import VendorForm from './forms/VendorForm';
import SalesOrderForm from './forms/SalesOrderForm';
import TransactionForm from '../../createNew/forms/TransactionForm.js';
import { Typography, Alert, Button } from '@/components/ui/TailwindComponents';
import AccountProfileForm from './forms/AccountProfileForm';

export default function renderForm(formOption, setFormOption, setShowForm, userData) {
  // Close form on component unmount
  React.useEffect(() => {
    return () => {
      // Clean up logic
    };
  }, []);

  logger.info('[RenderForm] Rendering form for:', formOption);

  switch (formOption) {
    case 'Customer':
      return (
        <>
          <CustomerForm />
        </>
      );
    case 'Vendor':
      return (
        <>
          <VendorForm />
        </>
      );
    case 'Product':
      return (
        <>
          <ProductManagement newProduct={true} />
        </>
      );
    case 'Service':
      return (
        <>
          <ServiceManagement newService={true} />
        </>
      );
    case 'Invoice':
      return (
        <>
          <InvoiceForm mode="create" />
        </>
      );
    case 'Bill':
      return (
        <>
          <BillForm />
        </>
      );
    case 'Estimate':
      return (
        <>
          <EstimateForm />
        </>
      );
    case 'Transaction':
      return (
        <>
          <TransactionForm />
        </>
      );
    case 'Account':
      return (
        <>
          <AccountProfileForm userData={userData} />
          <button
            onClick={() => {
              setFormOption(null);
              setShowForm(false);
            }}
            className="mt-4 p-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Close
          </button>
        </>
      );
    default:
      return (
        <div className="w-full p-4">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <Typography variant="h5" className="text-primary-main font-medium mb-4">
              Form Not Found
            </Typography>
            <Alert severity="warning" className="mb-4">
              The form '{formOption}' could not be found or is not yet implemented.
            </Alert>
            <Button
              color="primary"
              onClick={() => {
                setFormOption(null);
                setShowForm(false);
              }}
              className="mt-2"
            >
              Go Back
            </Button>
          </div>
        </div>
      );
  }
}
