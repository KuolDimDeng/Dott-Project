// Django API client placeholder
// This module is being migrated - use apiClient.js instead

import { axiosInstance } from '@/lib/axiosConfig';

// Export djangoApiClient as a placeholder that uses axiosInstance
export const djangoApiClient = axiosInstance;

// Also export as djangoApi for backward compatibility
export const djangoApi = axiosInstance;

// Default export
export default axiosInstance;