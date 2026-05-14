// frontend/src/services/teamService.js
import api from './api';

export const teamService = {
  // Create a new team
  createTeam: async (teamData) => {
    try {
      const response = await api.post('/teams/create', teamData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create team' };
    }
  },

  // Get all teams for admin
  getTeams: async () => {
    try {
      const response = await api.get('/teams');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch teams' };
    }
  },

  // Get team details
  getTeamDetails: async (teamId) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch team details' };
    }
  },

  // Accept invite (public - no auth)
  acceptInvite: async (inviteData) => {
    try {
      const response = await api.post('/teams/accept-invite', inviteData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to accept invitation' };
    }
  }
};