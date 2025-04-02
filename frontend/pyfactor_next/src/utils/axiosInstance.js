import { axiosInstance, serverAxiosInstance, enhancedAxiosInstance, retryRequest } from '@/lib/axiosConfig';

// Export the default instance for most use cases
export default axiosInstance;
export { axiosInstance, serverAxiosInstance, enhancedAxiosInstance, retryRequest }; 