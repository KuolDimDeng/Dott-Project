// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/DashboardWrapper.jsx

import { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { DashboardLoading } from '@/components/DashboardLoading/DashboardLoading';
import { logger } from '@/utils/logger';

export function DashboardWrapper({ children }) {
    const [setupStatus, setSetupStatus] = useState('pending');
    
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const response = await axiosInstance.get('/api/database/status');
                setSetupStatus(response.data.status);
            } catch (error) {
                logger.error('Access check failed:', error);
            }
        };

        const interval = setInterval(checkAccess, 5000);
        checkAccess(); // Initial check
        
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {children}
            {setupStatus !== 'complete' && <DashboardLoading status={setupStatus} />}
        </>
    );
}