// frontend/src/services/teamService.js
import api from './api';

export const teamService = {
  acceptInvite: async (data) => {
    try {
      const response = await api.post('/teams/accept-invite', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to accept invitation' };
    }
  }
};