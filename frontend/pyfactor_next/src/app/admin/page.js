'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { useAdminAuth } from './hooks/useAdminAuth';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';

export default function AdminPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isLoading, 
    adminUser, 
    login, 
    logout, 
    checkAuth 
  } = useAdminAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CenteredSpinner size="large" />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthenticated ? (
        <AdminLogin onLogin={login} />
      ) : (
        <AdminDashboard adminUser={adminUser} onLogout={logout} />
      )}
    </div>
  );
}