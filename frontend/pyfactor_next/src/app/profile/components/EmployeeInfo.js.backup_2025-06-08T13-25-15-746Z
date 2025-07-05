'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const EmployeeInfo = () => {
  const { employee } = useAuth();

  if (!employee) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
          <CardDescription>
            No employee information is associated with your account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Employee Information</CardTitle>
        <CardDescription>
          Your employee details
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="font-medium">Employee ID</Label>
          <p className="text-sm">{employee.employee_number}</p>
        </div>
        
        <div>
          <Label className="font-medium">Job Title</Label>
          <p className="text-sm">{employee.job_title || 'Not specified'}</p>
        </div>
        
        <div>
          <Label className="font-medium">Department</Label>
          <p className="text-sm">{employee.department || 'Not specified'}</p>
        </div>
        
        <div>
          <Label className="font-medium">Employment Type</Label>
          <p className="text-sm">
            {employee.employment_type === 'FT' ? 'Full-time' : 
             employee.employment_type === 'PT' ? 'Part-time' : 
             employee.employment_type || 'Not specified'}
          </p>
        </div>
        
        <div>
          <Label className="font-medium">Date Joined</Label>
          <p className="text-sm">
            {employee.date_joined ? 
              format(new Date(employee.date_joined), 'PPP') : 
              'Not specified'}
          </p>
        </div>
        
        <div>
          <Label className="font-medium">Employment Status</Label>
          <p className="text-sm">
            {employee.active ? 'Active' : 'Inactive'}
          </p>
        </div>
        
        {employee.probation && (
          <div>
            <Label className="font-medium">Probation Status</Label>
            <p className="text-sm">
              In probation
              {employee.probation_end_date ? 
                ` (until ${format(new Date(employee.probation_end_date), 'PPP')})` : 
                ''}
            </p>
          </div>
        )}
        
        <div>
          <Label className="font-medium">Benefits</Label>
          <p className="text-sm">
            {[
              employee.health_insurance_enrollment ? 'Health Insurance' : null,
              employee.pension_enrollment ? 'Pension Plan' : null
            ].filter(Boolean).join(', ') || 'None enrolled'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeInfo; 