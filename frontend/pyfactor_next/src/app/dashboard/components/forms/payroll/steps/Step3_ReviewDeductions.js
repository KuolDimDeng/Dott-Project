'use client';

import React, { useState, useEffect } from 'react';
import { ChartBarIcon, TrashIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { logger } from '@/utils/logger';
import FieldTooltip from '@/components/ui/FieldTooltip';

export default function Step3_ReviewDeductions({ 
  payrollData, 
  updatePayrollData, 
  onNext, 
  onPrevious 
}) {
  const [deductions, setDeductions] = useState(payrollData.deductions || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deductions && payrollData.calculations) {
      calculateDeductions();
    }
  }, []);

  const calculateDeductions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payroll/deductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          calculations: payrollData.calculations,
          employees: payrollData.employees.filter(emp => emp.includeInPayroll)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeductions(data.deductions);
        updatePayrollData('deductions', data.deductions);
      }
    } catch (error) {
      logger.error('Error calculating deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeCustomDeduction = (employeeId, deductionId) => {
    const updatedDeductions = {
      ...deductions,
      employees: deductions.employees.map(emp => {
        if (emp.id === employeeId) {
          const updatedCustomDeductions = emp.customDeductions.filter(d => d.id !== deductionId);
          const removedDeduction = emp.customDeductions.find(d => d.id === deductionId);
          const totalDeductions = emp.totalDeductions - (removedDeduction?.amount || 0);
          const netPay = emp.grossPay - totalDeductions;
          
          return {
            ...emp,
            customDeductions: updatedCustomDeductions,
            totalDeductions,
            netPay
          };
        }
        return emp;
      })
    };
    
    updatedDeductions.totalDeductions = updatedDeductions.employees.reduce(
      (sum, emp) => sum + emp.totalDeductions, 
      0
    );
    updatedDeductions.totalNet = updatedDeductions.employees.reduce(
      (sum, emp) => sum + emp.netPay, 
      0
    );
    
    setDeductions(updatedDeductions);
    updatePayrollData('deductions', updatedDeductions);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCountryDeductions = (employee) => {
    if (employee.country === 'US') {
      return (
        <>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">Federal Tax</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.federalTax)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">State Tax ({employee.state})</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.stateTax)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">Social Security (6.2%)</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.socialSecurity)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">Medicare (1.45%)</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.medicare)}</span>
          </div>
        </>
      );
    } else if (employee.country === 'KE') {
      return (
        <>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">PAYE</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.paye)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">NHIF</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.nhif)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm text-gray-600">NSSF</span>
            <span className="text-sm text-gray-900">-{formatCurrency(employee.nssf)}</span>
          </div>
        </>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  if (!deductions) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No deductions calculated yet.</p>
        <button
          onClick={calculateDeductions}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Calculate Deductions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <ChartBarIcon className="h-6 w-6 text-blue-600 mr-2" />
          Review Deductions & Taxes
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Review all deductions before finalizing payroll
        </p>
      </div>

      {/* Deductions by Employee */}
      <div className="space-y-4">
        {deductions.employees.map((employee) => (
          <div key={employee.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Employee Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-500">{employee.position}</p>
                </div>
                <div className="text-sm text-gray-600">
                  Gross Pay: {formatCurrency(employee.grossPay)}
                </div>
              </div>
            </div>

            {/* Deductions List */}
            <div className="px-6 py-4">
              {/* Country-specific deductions */}
              {getCountryDeductions(employee)}

              {/* Custom deductions */}
              {employee.customDeductions?.map((deduction) => (
                <div key={deduction.id} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{deduction.name}</span>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 mr-2">
                      -{formatCurrency(deduction.amount)}
                    </span>
                    <button
                      onClick={() => removeCustomDeduction(employee.id, deduction.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove deduction"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Total Deductions */}
              <div className="border-t border-gray-200 mt-3 pt-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Deductions</span>
                  <span className="text-sm font-medium text-gray-900">
                    -{formatCurrency(employee.totalDeductions)}
                  </span>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-blue-50 rounded-md p-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium text-blue-900">Net Pay</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(employee.netPay)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payroll Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Gross Pay</span>
            <span className="font-medium">{formatCurrency(deductions.totalGross)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Deductions</span>
            <span className="font-medium text-red-600">
              -{formatCurrency(deductions.totalDeductions)}
            </span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="text-lg font-medium text-gray-900">Total Net Pay</span>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(deductions.totalNet)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Continue to Approval
        </button>
      </div>
    </div>
  );
}