import React, { useState, useEffect } from 'react';
import { Modal, Button, Box, CircularProgress } from '@mui/material';
import {
  saveEstimate,
  printEstimate,
  emailEstimate,
  getEstimatePdf,
} from '../actions/estimateActions';
import EstimatePdfViewer from '../components/EstimatePdfViewer';

const EstimatePreviewModal = ({ isOpen, onClose, estimateId }) => {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (estimateId) {
      setLoading(true);
      getEstimatePdf(estimateId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlob(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching PDF:', err);
          setError('Failed to load PDF: ' + err.message);
          setLoading(false);
        });
    }
  }, [estimateId]);

  const handleSave = () => {
    saveEstimate(estimateId);
  };

  const handlePrint = () => {
    printEstimate(estimateId);
  };

  const handleEmail = () => {
    emailEstimate(estimateId);
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          width: '80%',
          height: '80%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <div>{error}</div>
        ) : (
          <EstimatePdfViewer pdfBlob={pdfBlob} />
        )}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleSave}>Save</Button>
          <Button onClick={handlePrint}>Print</Button>
          <Button onClick={handleEmail}>Email</Button>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default EstimatePreviewModal;
