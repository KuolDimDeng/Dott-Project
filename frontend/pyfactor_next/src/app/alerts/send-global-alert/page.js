// src/app/alerts/send-global-alert/page.js
'use client';
import React from 'react';
import GlobalAlertPage from '../components/GlobalAlertPage';
import AdminRoute from '../../../components/AdminRoute';

const SendGlobalAlertPage = () => {
  return <GlobalAlertPage />;
};

export default AdminRoute(SendGlobalAlertPage);
