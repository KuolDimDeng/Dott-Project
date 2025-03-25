'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Paper, 
  Snackbar, 
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: ''
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // In a real implementation, this would send data to a backend API
      // Send email to support@dottapps.com with form data
      const emailData = {
        to: 'support@dottapps.com',
        subject: `Contact Form: ${formData.subject}`,
        body: `
          Name: ${formData.name}
          Email: ${formData.email}
          Inquiry Type: ${formData.inquiryType}
          Message: ${formData.message}
        `
      };
      
      console.log('Form submitted:', formData);
      console.log('Email data:', emailData);
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        inquiryType: ''
      });
      
      // Show success message
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(true);
    }
  };
  
  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setSubmitted(false);
    setError(false);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.push('/')}
          variant="outlined"
        >
          Back to Home
        </Button>
        
        <Box 
          onClick={() => router.push('/')} 
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Image
            src="/static/images/PyfactorLandingpage.png"
            alt="Pyfactor Logo"
            width={120}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </Box>
      </Box>
      
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Contact Us
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          Have questions about our platform or need assistance? We're here to help! Fill out the form below, and our team will get back to you as soon as possible.
        </Typography>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Send Us a Message
            </Typography>
            
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Your Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Type of Inquiry</InputLabel>
                    <Select
                      name="inquiryType"
                      value={formData.inquiryType}
                      label="Type of Inquiry"
                      onChange={handleChange}
                    >
                      <MenuItem value="general">General Inquiry</MenuItem>
                      <MenuItem value="support">Technical Support</MenuItem>
                      <MenuItem value="billing">Billing Question</MenuItem>
                      <MenuItem value="partnership">Partnership Opportunity</MenuItem>
                      <MenuItem value="feedback">Feedback</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Your Message"
                    name="message"
                    multiline
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    fullWidth
                    size="large"
                    endIcon={<SendIcon />}
                  >
                    Send Message
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Contact Information
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Support
              </Typography>
              <Typography variant="body1" paragraph>
                Email: support@dottapps.com
              </Typography>
              <Typography variant="body1" paragraph>
                Support Hours: 24/7 Support Available
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Business Inquiries
              </Typography>
              <Typography variant="body1" paragraph>
                Email: business@dottapps.com
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Headquarters
              </Typography>
              <Typography variant="body1" paragraph>
                Dott, LLC<br />
                800 N King Street<br />
                Suite 304 #2797<br />
                Wilmington, DE 19801<br />
                United States
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Follow Us
              </Typography>
              <Typography variant="body1">
                Stay connected with us on social media for the latest updates, news, and resources.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar open={submitted} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
          Thank you! Your message has been sent successfully. We'll get back to you soon.
        </Alert>
      </Snackbar>
      
      <Snackbar open={error} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
          There was an error sending your message. Please try again later.
        </Alert>
      </Snackbar>
    </Container>
  );
}