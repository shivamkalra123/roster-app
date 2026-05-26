// frontend/src/services/memberService.js
import api from './api';

export const memberService = {
  getMyRoster: async (year, month) => {
    try {
      const response = await api.get(`/member/roster/${year}/${month}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get roster' };
    }
  },

  getMyProfile: async () => {
    try {
      const response = await api.get('/member/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get profile' };
    }
  },

  getMyHistory: async () => {
    try {
      const response = await api.get('/member/history');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get history' };
    }
  },

  getUpcomingShifts: async () => {
    try {
      const response = await api.get('/member/upcoming-shifts');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to get upcoming shifts' };
    }
  },

  requestShiftSwap: async (targetMemberId, date, reason) => {
    try {
      const response = await api.post('/member/swap-request', {
        targetMemberId,
        date,
        reason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to request swap' };
    }
  }
};