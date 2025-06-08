import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';

const BarcodeGenerator = ({ value, size = 150, type = 'qrcode', productInfo = {} }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (value && barcodeRef.current && type === 'barcode') {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, type]);

  // Generate content string for QR code, including product info
  const qrCodeValue = React.useMemo(() => {
    if (type === 'qrcode' && productInfo) {
      try {
        // Create a rich content string or JSON for the QR code
        const qrData = {
          id: value,
          ...productInfo
        };
        return JSON.stringify(qrData);
      } catch (e) {
        console.error('Error preparing QR data:', e);
        return value; // Fallback to simple value
      }
    }
    return value;
  }, [value, type, productInfo]);

  return (
    <div className="barcode-container">
      {type === 'barcode' ? (
        <svg ref={barcodeRef}></svg>
      ) : (
        <div className="qrcode-wrapper">
          <QRCodeSVG 
            value={qrCodeValue}
            size={size}
            level="H" // High error correction
            includeMargin={true}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
          />
        </div>
      )}
    </div>
  );
};

export default BarcodeGenerator; 