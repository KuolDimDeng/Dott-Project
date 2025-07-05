import React, { useState, useEffect } from 'react';
import { loadReactPdfRenderer } from '@/utils/dynamic-imports';

const EstimatePdfViewer = ({ pdfBlob }) => {
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [Document, setDocument] = useState(null);
  const [Page, setPage] = useState(null);

  useEffect(() => {
    async function loadPdfComponents() {
      try {
        const ReactPDF = await loadReactPdfRenderer();
        // Set up worker if needed
        if (ReactPDF.pdfjs && ReactPDF.pdfjs.GlobalWorkerOptions) {
          // Always use CDN version to avoid syntax errors in minified file
          const pdfVersion = ReactPDF.pdfjs.version || '2.16.105'; // fallback version
          ReactPDF.pdfjs.GlobalWorkerOptions.workerSrc = 
            `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfVersion}/pdf.worker.min.js`;
        }
        setDocument(ReactPDF.Document);
        setPage(ReactPDF.Page);
        if (pdfBlob) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load PDF components:', error);
        setLoading(false);
      }
    }
    
    loadPdfComponents();
  }, [pdfBlob]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  if (loading || !Document || !Page) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-main"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100%-50px)] overflow-auto">
      <Document file={pdfBlob} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
        ))}
      </Document>
    </div>
  );
};

export default EstimatePdfViewer;
