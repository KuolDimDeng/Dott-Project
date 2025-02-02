// components/DashboardSetupStatus.jsx
import { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, Alert } from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const DashboardSetupStatus = () => {
    const [setupState, setSetupState] = useState({
        show: true,
        progress: 0,
        error: null,
        complete: false
    });

    useEffect(() => {
        let mounted = true;
        const pollInterval = setInterval(async () => {
            try {
                const response = await axiosInstance.get('/api/onboarding/setup/status');
                if (!mounted) return;

                const { database_status, progress } = response.data;

                if (database_status === 'ready' || database_status === 'active') {
                    setSetupState(prev => ({ ...prev, show: false, complete: true }));
                    clearInterval(pollInterval);
                } else if (database_status === 'failed') {
                    setSetupState(prev => ({
                        ...prev,
                        error: 'Setup failed',
                        show: true
                    }));
                    clearInterval(pollInterval);
                } else {
                    setSetupState(prev => ({
                        ...prev,
                        progress: progress || prev.progress,
                        show: true
                    }));
                }
            } catch (error) {
                logger.error('Setup status check failed:', error);
            }
        }, 3000);

        return () => {
            mounted = false;
            clearInterval(pollInterval);
        };
    }, []);

    if (!setupState.show) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 1,
                boxShadow: 2,
                maxWidth: 300,
                zIndex: 1000
            }}
        >
            <Typography variant="body2" gutterBottom>
                {setupState.error ? 
                    'Setup failed. Please contact support.' : 
                    'Setting up your workspace...'}
            </Typography>
            {!setupState.error && (
                <LinearProgress 
                    variant="determinate" 
                    value={setupState.progress} 
                    sx={{ mt: 1 }} 
                />
            )}
        </Box>
    );
};

export default DashboardSetupStatus;