///Users/kuoldeng/projectx/frontend/pyfactor_next/pages/InvoiceTemplateBuilderPage.jsx
import React from 'react';
import { Box } from '@mui/material';
import InvoiceTemplateBuilder from '../src/components/InvoiceTemplateBuilder';

const InvoiceTemplateBuilderPage = () => {
  const handleClose = () => {
    window.close();
  };

  return (
    <Box>
      <InvoiceTemplateBuilder handleClose={handleClose} />
    </Box>
  );
};

export default InvoiceTemplateBuilderPage;