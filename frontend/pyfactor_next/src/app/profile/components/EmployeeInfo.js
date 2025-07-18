'use client';

import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const EmployeeInfo = ({ employee }) => {
  const { t } = useTranslation('profile');

  if (!employee) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('employeeInfo.title')}</CardTitle>
          <CardDescription>
            {t('employeeInfo.noEmployee')}
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
          {t('employeeInfo.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="font-medium">{t('employeeInfo.employeeId')}</Label>
          <p className="text-sm">{employee.employee_number}</p>
        </div>
        
        <div>
          <Label className="font-medium">{t('employeeInfo.jobTitle')}</Label>
          <p className="text-sm">{employee.job_title || t('employeeInfo.notSpecified')}</p>
        </div>
        
        <div>
          <Label className="font-medium">{t('employeeInfo.department')}</Label>
          <p className="text-sm">{employee.department || t('employeeInfo.notSpecified')}</p>
        </div>
        
        <div>
          <Label className="font-medium">{t('employeeInfo.employmentType')}</Label>
          <p className="text-sm">
            {employee.employment_type === 'FT' ? t('employeeInfo.fullTime') : 
             employee.employment_type === 'PT' ? t('employeeInfo.partTime') : 
             employee.employment_type || t('employeeInfo.notSpecified')}
          </p>
        </div>
        
        <div>
          <Label className="font-medium">{t('employeeInfo.dateHired')}</Label>
          <p className="text-sm">
            {employee.hire_date ? 
              format(new Date(employee.hire_date), 'PPP') : 
              t('employeeInfo.notSpecified')}
          </p>
        </div>
        
        <div>
          <Label className="font-medium">{t('employeeInfo.employmentStatus')}</Label>
          <p className="text-sm">
            {employee.active ? t('employeeInfo.statusActive') : t('employeeInfo.statusInactive')}
          </p>
        </div>
        
        {employee.probation && (
          <div>
            <Label className="font-medium">{t('employeeInfo.probationStatus')}</Label>
            <p className="text-sm">
              {t('employeeInfo.inProbation')}
              {employee.probation_end_date ? 
                ` (until ${format(new Date(employee.probation_end_date), 'PPP')})` : 
                ''}
            </p>
          </div>
        )}
        
        <div>
          <Label className="font-medium">{t('employeeInfo.benefits')}</Label>
          <p className="text-sm">
            {[
              employee.health_insurance_enrollment ? t('employeeInfo.healthInsurance') : null,
              employee.pension_enrollment ? t('employeeInfo.pensionPlan') : null
            ].filter(Boolean).join(', ') || t('employeeInfo.noneEnrolled')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeInfo; 