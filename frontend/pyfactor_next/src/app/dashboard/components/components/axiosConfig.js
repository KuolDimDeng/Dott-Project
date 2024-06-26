// src/app/dashboard/components/axiosConfig.js
import axios from 'axios';
import Cookies from 'js-cookie';

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    const csrfToken = Cookies.get('csrftoken');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error status is 401 and there is no originalRequest._retry flag,
    // it means the token has expired and we need to refresh it
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('http://localhost:8000/api/token/refresh/', { refresh: refreshToken });
        const newToken = response.data.access;
        
        localStorage.setItem('token', newToken);
        
        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (error) {
        // If refresh token fails, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;