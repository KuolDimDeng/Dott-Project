import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo";

// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, you can use localhost
// For physical devices, use your computer's local IP address
const baseURL = 'http://10.0.2.2:8000';  // Assuming you're using Android emulator

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection');
      }

      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Axios request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Axios request error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post(`${baseURL}/refresh-token/`, { refresh: refreshToken });
        const { access } = response.data;
        await AsyncStorage.setItem('token', access);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        // Handle navigation to login screen here if possible
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;