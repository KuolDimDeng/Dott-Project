// pages/customer-form.jsx
import React from 'react';
import MockRouterProvider from '@components/MockRouterProvider';
import CustomerForm from '@components/CustomerForm';

const CustomerFormPage = () => {
  console.log('Rendering CustomerFormPage');
  return (
    <MockRouterProvider>
      <CustomerForm />
    </MockRouterProvider>
  );
};

export default CustomerFormPage;