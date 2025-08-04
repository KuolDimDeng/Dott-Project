'use client';

import { apiService } from './apiService';

/**
 * Invoice Service - Extracted from massive apiClient.js
 * Handles all invoice-related API operations
 */
export const invoiceService = {
  // Get all invoices
  async getAll(params = {}) {
    return apiService.get('/invoices', params);
  },

  // Get invoice by ID
  async getById(id) {
    return apiService.get(`/invoices/${id}`);
  },

  // Create new invoice
  async create(invoiceData) {
    return apiService.post('/invoices', invoiceData);
  },

  // Update invoice
  async update(id, invoiceData) {
    return apiService.put(`/invoices/${id}`, invoiceData);
  },

  // Delete invoice
  async delete(id) {
    return apiService.delete(`/invoices/${id}`);
  },

  // Send invoice via email
  async sendEmail(id, emailData) {
    return apiService.post(`/invoices/${id}/send`, emailData);
  },

  // Mark invoice as paid
  async markPaid(id, paymentData = {}) {
    return apiService.post(`/invoices/${id}/mark-paid`, paymentData);
  },

  // Generate PDF
  async generatePDF(id) {
    return apiService.get(`/invoices/${id}/pdf`);
  },

  // Get invoice templates
  async getTemplates() {
    return apiService.get('/invoices/templates');
  },

  // Create from template
  async createFromTemplate(templateId, invoiceData) {
    return apiService.post(`/invoices/templates/${templateId}/create`, invoiceData);
  },

  // Recurring invoices
  async getRecurring(params = {}) {
    return apiService.get('/invoices/recurring', params);
  },

  async createRecurring(recurringData) {
    return apiService.post('/invoices/recurring', recurringData);
  }
};
