// pages/customer-form.jsx
import React from 'react';
import MockRouterProvider from '../src/app/dashboard/components/MockRouterProvider';
import CustomerForm from '../src/app/dashboard/components/CustomerForm';

const CustomerFormPage = () => {
  console.log('Rendering CustomerFormPage');
  return (
    <MockRouterProvider>
      <CustomerForm />
    </MockRouterProvider>
  );
};

export default CustomerFormPage;