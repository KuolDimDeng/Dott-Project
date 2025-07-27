'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CloudUpload,
  Description,
  Receipt,
  Image,
  Assignment,
  Delete,
  Visibility,
  CameraAlt,
  AttachFile
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';

const documentTypeIcons = {
  contract: Assignment,
  receipt: Receipt,
  invoice: Receipt,
  photo_before: Image,
  photo_progress: Image,
  photo_after: Image,
  permit: Description,
  equipment_rental: Assignment,
  completion_cert: Assignment,
  signature: Description,
  quote: Description,
  change_order: Assignment,
  other: AttachFile
};

const JobDocumentUpload = ({ job, documents = [], onDocumentAdded, onDocumentDeleted }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    document_type: '',
    title: '',
    description: '',
    vendor_name: '',
    amount: '',
    expense_date: '',
    is_billable: true
  });
  const [previewDialog, setPreviewDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!formData.document_type) {
      setError('Please select a document type first');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        
        const uploadData = {
          ...formData,
          file: base64,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        };

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const response = await jobsApi.uploadDocument(job.id, uploadData);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        onDocumentAdded && onDocumentAdded(response.data.document);
        
        // Reset form
        setFormData({
          document_type: '',
          title: '',
          description: '',
          vendor_name: '',
          amount: '',
          expense_date: '',
          is_billable: true
        });
        
        setTimeout(() => {
          setUploadProgress(0);
          setUploading(false);
        }, 1000);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.error || 'Failed to upload document');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await jobsApi.deleteDocument(job.id, documentId);
      onDocumentDeleted && onDocumentDeleted(documentId);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  const handlePreview = (document) => {
    setSelectedDocument(document);
    setPreviewDialog(true);
  };

  const getDocumentTypeLabel = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Documents
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  label="Document Type"
                >
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="receipt">Receipt</MenuItem>
                  <MenuItem value="invoice">Vendor Invoice</MenuItem>
                  <MenuItem value="photo_before">Before Photo</MenuItem>
                  <MenuItem value="photo_progress">Progress Photo</MenuItem>
                  <MenuItem value="photo_after">After Photo</MenuItem>
                  <MenuItem value="permit">Permit/License</MenuItem>
                  <MenuItem value="equipment_rental">Equipment Rental</MenuItem>
                  <MenuItem value="completion_cert">Completion Certificate</MenuItem>
                  <MenuItem value="quote">Quote Document</MenuItem>
                  <MenuItem value="change_order">Change Order</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            
            {(formData.document_type === 'receipt' || formData.document_type === 'invoice') && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Vendor Name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    InputProps={{
                      startAdornment: '$'
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (optional)"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
          
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelect}
              accept="image/*,application/pdf,.doc,.docx"
            />
            <input
              ref={cameraInputRef}
              type="file"
              hidden
              capture="environment"
              accept="image/*"
              onChange={handleFileSelect}
            />
            
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !formData.document_type}
            >
              Upload File
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CameraAlt />}
              onClick={handleCameraCapture}
              disabled={uploading || !formData.document_type}
            >
              Take Photo
            </Button>
          </Stack>
          
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary">
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {documents.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Documents ({documents.length})
            </Typography>
            
            <List>
              {documents.map((doc) => {
                const Icon = documentTypeIcons[doc.document_type] || AttachFile;
                return (
                  <ListItem key={doc.id} divider>
                    <ListItemIcon>
                      <Icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.title}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip 
                            label={getDocumentTypeLabel(doc.document_type)} 
                            size="small" 
                          />
                          {doc.amount && (
                            <Typography variant="caption">
                              ${doc.amount}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={() => handlePreview(doc)}
                        sx={{ mr: 1 }}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}
      
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDocument?.title}
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box>
              {selectedDocument.file_type?.startsWith('image/') ? (
                <img 
                  src={selectedDocument.file_url} 
                  alt={selectedDocument.title}
                  style={{ width: '100%', height: 'auto' }}
                />
              ) : (
                <Typography>
                  Preview not available for this file type. 
                  <Button 
                    href={selectedDocument.file_url} 
                    target="_blank"
                    sx={{ ml: 1 }}
                  >
                    Download
                  </Button>
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobDocumentUpload;