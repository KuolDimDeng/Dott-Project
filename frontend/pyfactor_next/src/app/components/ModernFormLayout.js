import React from 'react';
import { Box, Paper, Typography, Button, Grid, CircularProgress } from '@mui/material';

/**
 * A modern, consistent layout for forms across the application
 */
const ModernFormLayout = ({ 
  title, 
  subtitle, 
  children, 
  onSubmit, 
  isLoading = false,
  submitLabel = 'Save',
  footer,
  maxWidth = '1200px'
}) => {
  const handleSubmit = (e) => {
    // Don't block propagation on form submit
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <Box sx={{ maxWidth, mx: 'auto' }}>
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          mb: 4
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            mb: 1, 
            fontWeight: 600,
            color: theme => theme.palette.primary.main
          }}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 4 }}
          >
            {subtitle}
          </Typography>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate style={{ pointerEvents: 'auto' }}>
          <Grid container spacing={3}>
            {children}
          </Grid>
          
          <Box sx={{ 
            mt: 4, 
            display: 'flex', 
            justifyContent: 'flex-end',
            ...(footer && { justifyContent: 'space-between' })
          }}>
            {footer && (
              <Box>
                {footer}
              </Box>
            )}
            
            <Button 
              variant="contained" 
              type="submit"
              disabled={isLoading}
              sx={{ 
                px: 4,
                py: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              {isLoading ? <CircularProgress size={24} /> : submitLabel}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ModernFormLayout; 