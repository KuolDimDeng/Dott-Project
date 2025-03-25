'use client';

import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import OptimizedInventoryList from '../components/OptimizedInventoryList';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeedIcon from '@mui/icons-material/Speed';
import { logger } from '@/utils/logger';
import { optimizedInventoryService } from '@/services/optimizedInventoryService';

/**
 * Optimized Inventory Page
 * This page uses the optimized inventory components and services
 * for better performance and user experience
 */
export default function OptimizedInventoryPage() {
  const router = useRouter();

  // Prefetch data when the page loads
  useEffect(() => {
    logger.info('Initializing optimized inventory page');
    
    // Prefetch product data in the background
    optimizedInventoryService.prefetchProducts().catch(error => {
      logger.warn('Failed to prefetch product data:', error);
    });
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Page header */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(to right, #4a148c, #7b1fa2)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <SpeedIcon sx={{ mr: 1 }} /> Optimized Inventory Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'white', mt: 1, opacity: 0.9 }}>
              Enhanced performance with optimized backend and frontend
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/inventory')}
          >
            Back to Standard View
          </Button>
        </Box>
      </Paper>

      {/* Information alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          About Optimized Inventory
        </Typography>
        <Typography variant="body2">
          This page uses optimized endpoints and advanced caching strategies for better performance.
          It includes features like progressive loading, stale-while-revalidate caching, and offline support.
        </Typography>
      </Alert>

      {/* Performance features */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {[
          { title: 'Lightweight API', description: 'Optimized endpoints return only essential data' },
          { title: 'Progressive Loading', description: 'Load basic data first, then details as needed' },
          { title: 'Smart Caching', description: 'Stale-while-revalidate strategy for faster loading' },
          { title: 'Offline Support', description: 'Continue working even when offline' }
        ].map((feature, index) => (
          <Paper key={index} sx={{ p: 2, flex: '1 1 200px', borderLeft: '4px solid #7b1fa2' }}>
            <Typography variant="h6" fontWeight="bold">{feature.title}</Typography>
            <Typography variant="body2">{feature.description}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Main inventory component */}
      <OptimizedInventoryList />
    </Box>
  );
}