'use client';

import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { TextField, InputAdornment, IconButton, Box } from '@mui/material';
import { Visibility, VisibilityOff, Email as EmailIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { logger } from '@/utils/logger';

const SignInForm = ({ control, errors, credentialsLoginMutation }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false);
  const formId = React.useRef(crypto.randomUUID()).current;

  // Enhanced debug logging
  React.useEffect(() => {
    logger.debug('SignInForm mounted', {
      formId,
      hasErrors: Object.keys(errors).length > 0,
      isSubmitting: credentialsLoginMutation.isPending,
      errorTypes: Object.keys(errors).join(', '),  // Log specific error types
      timestamp: new Date().toISOString()
    });
    
    return () => {
      logger.debug('SignInForm unmounting', {
        formId,
        timestamp: new Date().toISOString()
      });
    };
  }, [errors, credentialsLoginMutation.isPending, formId]);

  // Handle field changes with improved logging
  const handleFieldChange = (fieldName, e, field) => {
    field.onChange(e);
    logger.debug(`${fieldName} field changed`, {
      formId,
      field: fieldName,
      hasValue: !!e.target.value,
      isValid: !errors[fieldName.toLowerCase()],
      timestamp: new Date().toISOString()
    });
  };

  return (
    <Box
      component="div"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%'
      }}
    >
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Email Address"
            autoComplete="email"  // Added for better UX
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={credentialsLoginMutation.isPending}
            onChange={(e) => handleFieldChange('Email', e, field)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon 
                    sx={{ 
                      color: errors.email ? 'error.main' : 'text.secondary' 
                    }} 
                  />
                </InputAdornment>
              ),
            }}
          />
        )}
      />
      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            fullWidth
            label="Password"
            type={isPasswordShown ? 'text' : 'password'}
            autoComplete="current-password"  // Added for better UX
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={credentialsLoginMutation.isPending}
            onChange={(e) => handleFieldChange('Password', e, field)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => {
                      setIsPasswordShown(!isPasswordShown);
                      logger.debug('Password visibility toggled', {
                        formId,
                        isVisible: !isPasswordShown,
                        timestamp: new Date().toISOString()
                      });
                    }} 
                    edge="end"
                    disabled={credentialsLoginMutation.isPending}
                    aria-label={isPasswordShown ? "Hide password" : "Show password"}
                  >
                    {isPasswordShown ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !credentialsLoginMutation.isPending) {
                logger.debug('Enter key pressed in password field', {
                  formId,
                  timestamp: new Date().toISOString()
                });
              }
            }}
          />
        )}
      />
    </Box>
  );
};

SignInForm.propTypes = {
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  credentialsLoginMutation: PropTypes.shape({
    isPending: PropTypes.bool.isRequired
  }).isRequired
};

export default SignInForm;