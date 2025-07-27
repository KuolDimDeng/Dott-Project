'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  IconButton,
  Alert
} from '@mui/material';
import {
  Clear,
  Check,
  Undo
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';

const SignatureCapture = ({ open, onClose, job, signatureType = 'customer', onSuccess }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [open]);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const context = canvas.getContext('2d');
      context.strokeStyle = '#000';
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    }
  }, [open]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const startDrawingTouch = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const drawTouch = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!hasSignature || !signedName) {
      setError('Please provide both signature and name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      const signatureData = canvas.toDataURL('image/png');
      
      const data = {
        signature_type: signatureType,
        signature_data: signatureData,
        signed_name: signedName,
        ...location
      };

      const response = await jobsApi.captureSignature(job.id, data);
      onSuccess && onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error capturing signature:', err);
      setError(err.response?.data?.error || 'Failed to capture signature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {signatureType === 'customer' ? 'Customer Signature' : 'Supervisor Signature'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Typography variant="body2" color="text.secondary">
            Job #{job?.job_number} - {job?.name}
          </Typography>
          
          <TextField
            label={signatureType === 'customer' ? "Customer Name" : "Supervisor Name"}
            fullWidth
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            required
          />
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Draw signature below:
            </Typography>
            <Box
              sx={{
                border: '2px solid #ccc',
                borderRadius: 1,
                position: 'relative',
                backgroundColor: '#fff',
                cursor: 'crosshair'
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ 
                  width: '100%', 
                  height: '200px',
                  touchAction: 'none'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawingTouch}
                onTouchMove={drawTouch}
                onTouchEnd={stopDrawing}
              />
              <IconButton
                size="small"
                onClick={clearSignature}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'background.paper',
                  '&:hover': { backgroundColor: 'background.default' }
                }}
              >
                <Clear />
              </IconButton>
            </Box>
            {!hasSignature && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Use mouse or touch to draw signature
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !hasSignature || !signedName}
          startIcon={<Check />}
        >
          Capture Signature
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignatureCapture;