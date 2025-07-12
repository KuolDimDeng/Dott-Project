'use client';

import React from 'react';
import EmployeeManagementV2Test from '@/app/dashboard/components/forms/EmployeeManagementV2Test';
import { ToastProvider } from '@/components/Toast/ToastProvider';

export default function TestV2Page() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-100">
        <EmployeeManagementV2Test />
      </div>
    </ToastProvider>
  );
}