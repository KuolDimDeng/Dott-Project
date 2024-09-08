// src/app/dashboard/components/axiosConfig.js
import axios from 'axios';
import Cookies from 'js-cookie';
import axiosInstance from '../components/components/axiosConfig.jsaxiosConfig';


const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const noAuthRequired = ['/api/register/', '/api/token/', '/api/token/refresh/'];

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  //timeout: 30000, // Set a timeout of 10 seconds
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    const csrfToken = Cookies.get('csrftoken');
    
    // Check if the request URL is in the noAuthRequired list
    const isAuthRequired = !noAuthRequired.some(url => config.url.includes(url));
    
    if (token && isAuthRequired) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);


// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
      
      // Handle 401 (Unauthorized) errors
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
        
        try {
          const response = await axios.post(`${baseURL}/api/token/refresh/`, { refresh: refreshToken });
          const newToken = response.data.access;
          
          localStorage.setItem('token', newToken);
          
          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh token fails, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
      
      // Handle 403 (Forbidden) errors
      if (error.response.status === 403) {
        console.error('Permission denied:', error.response.data);
        // You might want to redirect to an "Access Denied" page or show a message
        if (typeof window !== 'undefined') {
          // Replace this with your preferred way of showing "Access Denied" messages
          alert('Access Denied: You do not have permission to perform this action.');
        }
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up the request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;