// frontend/src/services/memberService.js
import api from './api';

export const memberService = {
  // Add a single member
  addMember: async (teamId, memberData) => {
    try {
      const response = await api.post(`/teams/${teamId}/members`, memberData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to add member' };
    }
  },

  // Bulk add members
  bulkAddMembers: async (teamId, members) => {
    try {
      const response = await api.post(`/teams/${teamId}/members/bulk`, { members });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to add members' };
    }
  },

  // Get all members
  getMembers: async (teamId) => {
    try {
      const response = await api.get(`/teams/${teamId}/members`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch members' };
    }
  },

  // Get single member
  getMember: async (teamId, memberId) => {
    try {
      const response = await api.get(`/teams/${teamId}/members/${memberId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch member' };
    }
  },

  // Update member
  updateMember: async (teamId, memberId, updates) => {
    try {
      const response = await api.put(`/teams/${teamId}/members/${memberId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update member' };
    }
  },

  // Remove member
  removeMember: async (teamId, memberId) => {
    try {
      const response = await api.delete(`/teams/${teamId}/members/${memberId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to remove member' };
    }
  },

  // Resend invitation
  resendInvite: async (teamId, email) => {
    try {
      const response = await api.post(`/teams/${teamId}/resend-invite`, { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to resend invitation' };
    }
  },

  // Cancel invitation
  cancelInvite: async (teamId, email) => {
    try {
      const response = await api.delete(`/teams/${teamId}/cancel-invite`, { data: { email } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to cancel invitation' };
    }
  },

  // Rebuild shift counts
  rebuildShiftCounts: async (teamId) => {
    try {
      const response = await api.post(`/teams/${teamId}/rebuild-shift-counts`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to rebuild shift counts' };
    }
  }
};