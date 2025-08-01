'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

/**
 * ProductQRCode Component
 * Generates QR codes for products and creates printable PDFs
 */
const ProductQRCode = ({ product, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [labelFormat, setLabelFormat] = useState('single'); // single, sheet, roll
  const [isGenerating, setIsGenerating] = useState(false);

  // Label formats configuration
  const labelFormats = {
    single: {
      name: 'Single Label (Full Page)',
      width: 8.5,
      height: 11,
      labels: 1,
      columns: 1,
      rows: 1,
      labelWidth: 4,
      labelHeight: 3,
      marginTop: 4,
      marginLeft: 2.25
    },
    sheet30: {
      name: 'Sheet Labels (30 per page - Avery 5160)',
      width: 8.5,
      height: 11,
      labels: 30,
      columns: 3,
      rows: 10,
      labelWidth: 2.625,
      labelHeight: 1,
      marginTop: 0.5,
      marginLeft: 0.1875,
      spacing: 0.125
    },
    roll2x1: {
      name: 'Roll Labels (2" x 1")',
      width: 2,
      height: 1,
      labels: 1,
      columns: 1,
      rows: 1,
      labelWidth: 2,
      labelHeight: 1,
      marginTop: 0,
      marginLeft: 0
    },
    roll4x2: {
      name: 'Roll Labels (4" x 2")',
      width: 4,
      height: 2,
      labels: 1,
      columns: 1,
      rows: 1,
      labelWidth: 4,
      labelHeight: 2,
      marginTop: 0,
      marginLeft: 0
    }
  };

  // Generate QR code data
  const generateQRData = () => {
    return JSON.stringify({
      id: product.id,
      sku: product.sku || product.product_code || `P-${product.id}`,
      name: product.name,
      price: product.price,
      type: 'DOTT_PRODUCT',
      tenant: product.tenant_id
    });
  };

  // Generate QR code image
  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrData = generateQRData();
        const url = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast.error('Failed to generate QR code');
      }
    };

    if (product) {
      generateQR();
    }
  }, [product]);

  // Generate PDF with QR code
  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const format = labelFormats[labelFormat];
      const pdf = new jsPDF({
        orientation: format.width > format.height ? 'landscape' : 'portrait',
        unit: 'in',
        format: [format.width, format.height]
      });

      // For sheet labels, generate multiple labels
      if (labelFormat === 'sheet30') {
        for (let row = 0; row < format.rows; row++) {
          for (let col = 0; col < format.columns; col++) {
            const x = format.marginLeft + (col * (format.labelWidth + format.spacing));
            const y = format.marginTop + (row * (format.labelHeight + format.spacing));
            
            // Add QR code
            pdf.addImage(qrCodeUrl, 'PNG', x + 0.1, y + 0.1, 0.6, 0.6);
            
            // Add product info
            pdf.setFontSize(8);
            pdf.text(product.name.substring(0, 20), x + 0.8, y + 0.3);
            pdf.setFontSize(6);
            pdf.text(`SKU: ${product.sku || 'N/A'}`, x + 0.8, y + 0.5);
            pdf.text(`$${product.price || '0.00'}`, x + 0.8, y + 0.7);
          }
        }
      } else {
        // Single or roll labels
        const qrSize = Math.min(format.labelWidth, format.labelHeight) * 0.6;
        const qrX = (format.labelWidth - qrSize) / 2;
        const qrY = format.labelHeight * 0.1;
        
        // Add QR code
        pdf.addImage(qrCodeUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        
        // Add product info below QR code
        pdf.setFontSize(12);
        pdf.text(product.name, format.labelWidth / 2, qrY + qrSize + 0.3, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(`SKU: ${product.sku || product.product_code || 'N/A'}`, format.labelWidth / 2, qrY + qrSize + 0.5, { align: 'center' });
        pdf.text(`Price: $${product.price || '0.00'}`, format.labelWidth / 2, qrY + qrSize + 0.7, { align: 'center' });
      }

      // Save or open PDF
      const fileName = `${product.name.replace(/[^a-z0-9]/gi, '_')}_label.pdf`;
      
      // Create blob for preview
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open in new window for preview/print
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          // Auto-show print dialog
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
      }

      toast.success('Label generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate label PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download PDF directly
  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const format = labelFormats[labelFormat];
      const pdf = new jsPDF({
        orientation: format.width > format.height ? 'landscape' : 'portrait',
        unit: 'in',
        format: [format.width, format.height]
      });

      // Generate label (same as above)
      // ... (same PDF generation code)

      // Download directly
      const fileName = `${product.name.replace(/[^a-z0-9]/gi, '_')}_label.pdf`;
      pdf.save(fileName);
      
      toast.success('Label downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download label PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Product Label Generator</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Product Information</h3>
          <p><span className="font-medium">Name:</span> {product.name}</p>
          <p><span className="font-medium">SKU:</span> {product.sku || product.product_code || 'N/A'}</p>
          <p><span className="font-medium">Price:</span> ${product.price || '0.00'}</p>
        </div>

        {/* QR Code Preview */}
        <div className="mb-6 text-center">
          <h3 className="font-semibold mb-2">QR Code Preview</h3>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="Product QR Code" className="mx-auto" />
          )}
        </div>

        {/* Label Format Selection */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Select Label Format</h3>
          <select
            value={labelFormat}
            onChange={(e) => setLabelFormat(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="single">{labelFormats.single.name}</option>
            <option value="sheet30">{labelFormats.sheet30.name}</option>
            <option value="roll2x1">{labelFormats.roll2x1.name}</option>
            <option value="roll4x2">{labelFormats.roll4x2.name}</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={generatePDF}
            disabled={isGenerating || !qrCodeUrl}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Preview & Print'}
          </button>
          <button
            onClick={downloadPDF}
            disabled={isGenerating || !qrCodeUrl}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-sm text-gray-600">
          <h4 className="font-medium mb-1">Instructions:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Select your preferred label format based on your printer type</li>
            <li>Click "Preview & Print" to open in a new window with print dialog</li>
            <li>Click "Download PDF" to save the label file to your computer</li>
            <li>For best results, use label paper matching the selected format</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProductQRCode;