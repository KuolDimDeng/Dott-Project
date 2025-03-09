// src/components/CookieBanner.jsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Link,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import NextLink from 'next/link';

const CookieBanner = () => {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Essential cookies cannot be disabled
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a cookie choice
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Wait a short time before showing the banner for better UX
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    setPreferences({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
    setOpen(false);
    // Here you would enable all your cookie-setting scripts
  };

  const handleAcceptSelected = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setOpen(false);
    setShowPreferences(false);
    // Here you would enable only the cookie types that were selected
  };

  const handleRejectAll = () => {
    localStorage.setItem('cookieConsent', 'essential');
    setPreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
    setOpen(false);
    // Here you would disable all non-essential cookies
  };

  const handlePreferenceChange = (event) => {
    setPreferences({
      ...preferences,
      [event.target.name]: event.target.checked,
    });
  };

  if (!open) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999, // Increased z-index to ensure it's above Crisp chat
        p: 3,
        borderRadius: { xs: 0 },
        boxShadow: '0 -4px 10px rgba(0,0,0,0.1)',
        width: '100%',
      }}
    >
      {!showPreferences ? (
        <>
          <Typography variant="h6" gutterBottom>
            We Value Your Privacy
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. Read our{' '}
            <Link component={NextLink} href="/cookies">
              Cookie Policy
            </Link>{' '}
            to learn more.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setShowPreferences(true)}
            >
              Cookie Settings
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleRejectAll}
            >
              Reject All
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAcceptAll}
            >
              Accept All
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Cookie Preferences
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={preferences.essential} 
                  disabled={true}  // Essential cookies cannot be disabled
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2">Essential (Required)</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    These cookies are necessary for the website to function and cannot be switched off.
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={preferences.functional} 
                  onChange={handlePreferenceChange} 
                  name="functional" 
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2">Functional</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    These cookies enable personalized features and functionality.
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={preferences.analytics} 
                  onChange={handlePreferenceChange} 
                  name="analytics" 
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2">Analytics</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    These cookies help us understand how visitors interact with our website.
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={preferences.marketing} 
                  onChange={handlePreferenceChange} 
                  name="marketing" 
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2">Marketing</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    These cookies are used to track visitors across websites to display relevant advertisements.
                  </Typography>
                </Box>
              }
            />
          </FormGroup>
          
          <Divider sx={{ my: 2 }} />
          
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="outlined"
              onClick={() => setShowPreferences(false)}
            >
              Back
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleRejectAll}
            >
              Reject All
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAcceptSelected}
            >
              Save Preferences
            </Button>
          </Stack>
        </>
      )}
    </Paper>
  );
};

export default CookieBanner;