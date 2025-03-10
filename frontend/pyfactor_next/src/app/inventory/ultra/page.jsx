'use client';

import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper, Alert, Divider } from '@mui/material';
import UltraOptimizedInventoryList from '../components/UltraOptimizedInventoryList';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeedIcon from '@mui/icons-material/Speed';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { logger } from '@/utils/logger';
import { ultraOptimizedInventoryService } from '@/services/ultraOptimizedInventoryService';

/**
 * Ultra-Optimized Inventory Page
 * This page uses the ultra-optimized inventory components and services
 * for maximum performance and user experience
 */
export default function UltraOptimizedInventoryPage() {
  const router = useRouter();

  // Prefetch data when the page loads
  useEffect(() => {
    logger.info('Initializing ultra-optimized inventory page');
    
    // Prefetch essential data in the background
    ultraOptimizedInventoryService.prefetchEssentialData().catch(error => {
      logger.warn('Failed to prefetch essential data:', error);
    });
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Page header */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(to right, #1a237e, #3949ab)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
              <RocketLaunchIcon sx={{ mr: 1 }} /> Ultra-Optimized Inventory
            </Typography>
            <Typography variant="body1" sx={{ color: 'white', mt: 1, opacity: 0.9 }}>
              Maximum performance with ultra-optimized backend and frontend
            </Typography>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/inventory/optimized')}
              sx={{ mr: 1 }}
            >
              Optimized View
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/inventory')}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Standard View
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Information alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          About Ultra-Optimized Inventory
        </Typography>
        <Typography variant="body2">
          This page uses ultra-optimized endpoints and advanced caching strategies for maximum performance.
          It includes features like progressive loading, stale-while-revalidate caching, offline support, and more.
        </Typography>
      </Alert>

      {/* Performance features */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {[
          { 
            title: 'Ultra-Lightweight API', 
            description: 'Minimal data transfer with only essential fields' 
          },
          { 
            title: 'Advanced Caching', 
            description: 'Stale-while-revalidate pattern with tiered TTLs' 
          },
          { 
            title: 'Progressive Loading', 
            description: 'Load critical data first, then enhance with details' 
          },
          { 
            title: 'Offline Support', 
            description: 'Continue working even when offline' 
          },
          { 
            title: 'Prefetching', 
            description: 'Preload data during browser idle time' 
          },
          { 
            title: 'Optimized Rendering', 
            description: 'Lazy loading and code splitting for faster UI' 
          },
          { 
            title: 'Database Optimizations', 
            description: 'Specialized indexes and query optimizations' 
          },
          { 
            title: 'Adaptive View Modes', 
            description: 'Choose between ultra-fast, standard, or detailed views' 
          }
        ].map((feature, index) => (
          <Paper key={index} sx={{ p: 2, flex: '1 1 250px', borderLeft: '4px solid #3949ab' }}>
            <Typography variant="h6" fontWeight="bold">{feature.title}</Typography>
            <Typography variant="body2">{feature.description}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Performance comparison */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <SpeedIcon sx={{ mr: 1 }} /> Performance Comparison
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The ultra-optimized inventory system offers significant performance improvements over the standard implementation:
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary">Standard Implementation</Typography>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2">• 30-second API timeout</Typography>
            <Typography variant="body2">• Full data serialization</Typography>
            <Typography variant="body2">• Basic caching</Typography>
            <Typography variant="body2">• No offline support</Typography>
            <Typography variant="body2">• No prefetching</Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="secondary">Optimized Implementation</Typography>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2">• 15-second API timeout</Typography>
            <Typography variant="body2">• Lightweight serialization</Typography>
            <Typography variant="body2">• Redis caching (5 min TTL)</Typography>
            <Typography variant="body2">• Basic offline support</Typography>
            <Typography variant="body2">• Simple prefetching</Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 200px' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="success.main">Ultra-Optimized Implementation</Typography>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="body2">• 5-second API timeout</Typography>
            <Typography variant="body2">• Ultra-lightweight serialization</Typography>
            <Typography variant="body2">• Tiered caching with stale-while-revalidate</Typography>
            <Typography variant="body2">• Full offline support</Typography>
            <Typography variant="body2">• Intelligent prefetching</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Main inventory component */}
      <UltraOptimizedInventoryList />
    </Box>
  );
}