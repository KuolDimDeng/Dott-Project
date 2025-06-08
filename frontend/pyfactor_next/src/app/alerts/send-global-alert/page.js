'use client';

// src/app/alerts/send-global-alert/page.js
import React from 'react';
import GlobalAlertPage from '../components/GlobalAlertPage';
import AdminRoute from '../../../components/AdminRoute';

const SendGlobalAlertPage = () => {
  return (
    <AdminRoute>
      <GlobalAlertPage />
    </AdminRoute>
  );
};

export default SendGlobalAlertPage;
