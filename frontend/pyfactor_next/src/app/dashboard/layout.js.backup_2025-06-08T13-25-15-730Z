// This file is a server component (no 'use client' directive) for metadata
import React from 'react';
import DashboardClientLayout from './DashboardClientLayout';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';
import SessionProviderWrapper from './SessionProviderWrapper';

// Export metadata from this server component
export const metadata = {
  title: 'Dashboard | Dott Business Management',
  description: 'Loading your dashboard...',
};

// The layout is now a server component that wraps the client component
export default function DashboardLayout({ children }) {
  return (
    <>
      <MiddlewareHeaderHandler />
      <SessionProviderWrapper>
        <DashboardClientLayout>
          {children}
        </DashboardClientLayout>
      </SessionProviderWrapper>
    </>
  );
}