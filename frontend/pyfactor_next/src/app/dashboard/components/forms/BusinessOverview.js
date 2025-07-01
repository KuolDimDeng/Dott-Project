'use client';

import React from 'react';

const BusinessOverview = () => {
  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        Business Overview
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Complete snapshot of your business performance
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>TOTAL ASSETS</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Cash + Inventory + Receivables</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>TOTAL LIABILITIES</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Payables + Loans</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>EQUITY</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Assets - Liabilities</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>BANK BALANCE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>All accounts</p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>TOTAL REVENUE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>All time</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>MONTHLY REVENUE</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>This month</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>EXPENSES</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$0.00</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>This month</p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>PROFIT MARGIN</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>0%</p>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Revenue - Expenses</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}>
            New Order
          </button>
          <button style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}>
            Create Invoice
          </button>
          <button style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}>
            Add Customer
          </button>
          <button style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer' }}>
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessOverview;