// This file is a server component (no 'use client' directive) for metadata
import React from 'react';
import DashboardClientLayout from './DashboardClientLayout';

// Export metadata from this server component
export const metadata = {
  title: 'Dashboard | PyFactor',
  description: 'PyFactor Dashboard - Manage your business efficiently',
};

// The layout is now a server component that wraps the client component
export default function DashboardLayout({ children }) {
  return (
    <DashboardClientLayout>
      {children}
    </DashboardClientLayout>
  );
}