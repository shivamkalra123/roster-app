// admin/src/services/authService.js
import api from './api';

export const adminLogin = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Login failed',
    };
  }
};

export const verifyToken = async () => {
  try {
    const response = await api.get('/auth/verify');
    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Token verification failed',
    };
  }
};