import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeGenerator = ({ productId }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (productId && barcodeRef.current) {
      JsBarcode(barcodeRef.current, productId, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
      });
    }
  }, [productId]);

  return (
    <div>
      <svg ref={barcodeRef}></svg>
    </div>
  );
};

export default BarcodeGenerator; 