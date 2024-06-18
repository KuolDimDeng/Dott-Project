// src/app/dashboard/components/axiosConfig.js
import axios from 'axios';
import Cookies from 'js-cookie';

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const token = getToken();
const csrfToken = Cookies.get('csrftoken');

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
    Authorization: token ? `Bearer ${token}` : '',
  },
});

export default axiosInstance;