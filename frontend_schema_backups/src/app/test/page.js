'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { optimizeJsPDF } from '@/utils/pdfOptimizer';
import './test.css';

export default function TestPage() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePdf = () => {
    try {
      setLoading(true);
      setError('');
      
      // Create PDF document with memory optimization
      const doc = optimizeJsPDF(new jsPDF());
      
      // Add content to PDF
      doc.setFontSize(24);
      doc.text('Test PDF Document', 20, 30);
      
      doc.setFontSize(12);
      doc.text('This PDF was generated to test memory optimization.', 20, 50);
      doc.text(`Generated at: ${new Date().toLocaleString()}`, 20, 60);
      
      // Convert to data URL
      const dataUrl = doc.output('dataurlstring');
      setPdfUrl(dataUrl);
      
      setLoading(false);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(`Error generating PDF: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="test-container">
      <h1 className="test-title">CSS and PDF Test Page</h1>
      
      <div className="test-card">
        <h2>CSS Test</h2>
        <p>This page uses custom CSS styling to verify that the CSS plugin is working correctly.</p>
        <div className="test-box">
          <span>Styled Element</span>
        </div>
      </div>
      
      <div className="test-card">
        <h2>PDF Test</h2>
        <p>Generate and view a PDF to test PDF functionality:</p>
        <button 
          className="test-button"
          onClick={generatePdf}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
        
        {error && <div className="test-error">{error}</div>}
        
        {pdfUrl && (
          <div className="test-pdf-container">
            <iframe 
              src={pdfUrl} 
              className="test-pdf-viewer"
              title="Generated PDF"
            />
          </div>
        )}
      </div>
      
      <div className="test-card">
        <h2>Memory Usage</h2>
        <p>Check browser's Task Manager to monitor memory usage during PDF operations.</p>
        <p className="test-note">
          Chrome: More Tools {'>'} Task Manager<br />
          Firefox: about:performance<br />
          Safari: Window {'>'} Activity
        </p>
      </div>
    </div>
  );
} 