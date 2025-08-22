'use client';

import React, { useState, useEffect } from 'react';
import PayTab from './tabs/PayTab';
import StandardSpinner from '@/components/ui/StandardSpinner';

/**
 * PayForm Component
 * Main container for all pay-related information and functionality
 */
const PayForm = () => {
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeId();
  }, []);

  const fetchEmployeeId = async () => {
    try {
      // First try to get the current user's employee record using the correct endpoint
      const response = await fetch('/api/hr/current-employee');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Employee data:', data);
        setEmployeeId(data.id || data.employee_id);
      } else {
        // If no employee record, try to get user info and create/link employee
        const userResponse = await fetch('/api/users/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data:', userData);
          // For now, we'll use the user ID as a fallback
          setEmployeeId(userData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching employee ID:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <StandardSpinner size="default" />
        </div>
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Pay & Benefits</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your compensation, tax withholdings, and benefit enrollments
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-gray-700">
            No employee record found. Please contact your HR administrator to set up your employee profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pay & Benefits</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage your compensation, tax withholdings, and benefit enrollments
        </p>
      </div>
      
      <PayTab employeeId={employeeId} />
    </div>
  );
};

export default PayForm; 