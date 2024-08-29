import { pdfjs } from 'react-pdf';

// Use the worker from your public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { CircularProgress } from '@mui/material';

const EstimatePdfViewer = ({ pdfBlob }) => {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pdfBlob) {
      setLoading(false);
    }
  }, [pdfBlob]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div style={{ width: '100%', height: 'calc(100% - 50px)', overflow: 'auto' }}>
      <Document
        file={pdfBlob}
        onLoadSuccess={onDocumentLoadSuccess}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            width={600}
          />
        ))}
      </Document>
    </div>
  );
};

export default EstimatePdfViewer;
