'use client';

import { apiService } from './apiService';

/**
 * HR Service - Extracted from massive apiClient.js
 * Handles all HR-related API operations
 */
export const hrService = {
  // Employee management
  async getEmployees(params = {}) {
    return apiService.get('/hr/employees', params);
  },

  async getEmployeeById(id) {
    return apiService.get(`/hr/employees/${id}`);
  },

  async createEmployee(employeeData) {
    return apiService.post('/hr/employees', employeeData);
  },

  async updateEmployee(id, employeeData) {
    return apiService.put(`/hr/employees/${id}`, employeeData);
  },

  async deleteEmployee(id) {
    return apiService.delete(`/hr/employees/${id}`);
  },

  // Payroll management
  async getPayrollRuns(params = {}) {
    return apiService.get('/hr/payroll/runs', params);
  },

  async createPayrollRun(payrollData) {
    return apiService.post('/hr/payroll/runs', payrollData);
  },

  async getPayrollRunById(id) {
    return apiService.get(`/hr/payroll/runs/${id}`);
  },

  async processPayroll(id) {
    return apiService.post(`/hr/payroll/runs/${id}/process`);
  },

  // Timesheet management
  async getTimesheets(params = {}) {
    return apiService.get('/hr/timesheets', params);
  },

  async getEmployeeTimesheets(employeeId, params = {}) {
    return apiService.get(`/hr/employees/${employeeId}/timesheets`, params);
  },

  async createTimesheet(timesheetData) {
    return apiService.post('/hr/timesheets', timesheetData);
  },

  async updateTimesheet(id, timesheetData) {
    return apiService.put(`/hr/timesheets/${id}`, timesheetData);
  },

  async approveTimesheet(id) {
    return apiService.post(`/hr/timesheets/${id}/approve`);
  },

  async rejectTimesheet(id, reason) {
    return apiService.post(`/hr/timesheets/${id}/reject`, { reason });
  },

  // Tax management
  async getTaxForms(params = {}) {
    return apiService.get('/hr/tax-forms', params);
  },

  async generateTaxForm(employeeId, formType, taxYear) {
    return apiService.post('/hr/tax-forms/generate', {
      employee_id: employeeId,
      form_type: formType,
      tax_year: taxYear
    });
  },

  // Benefits management
  async getBenefits() {
    return apiService.get('/hr/benefits');
  },

  async getEmployeeBenefits(employeeId) {
    return apiService.get(`/hr/employees/${employeeId}/benefits`);
  },

  async enrollInBenefit(employeeId, benefitId, enrollmentData) {
    return apiService.post(`/hr/employees/${employeeId}/benefits/${benefitId}/enroll`, enrollmentData);
  }
};
