// admin/src/services/rosterService.js
import api from './api';

// ==================== BASIC ROSTER OPERATIONS ====================
export const previewRoster = async (teamId, year, month) => {
  try {
    const response = await api.post(`/roster/${teamId}/preview`, { year, month });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to preview roster' };
  }
};

export const confirmRoster = async (teamId, year, month) => {
  try {
    const response = await api.post(`/roster/${teamId}/confirm`, { 
      year, 
      month, 
      confirmationToken: 'CONFIRM' 
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to confirm roster' };
  }
};

export const getRoster = async (teamId, year, month) => {
  try {
    const response = await api.get(`/roster/${teamId}/${year}/${month}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get roster' };
  }
};

export const deleteRoster = async (teamId, year, month) => {
  try {
    const response = await api.delete(`/roster/${teamId}/${year}/${month}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to delete roster' };
  }
};

// ==================== SHIFT CONFIGURATION ====================
export const getShifts = async (teamId) => {
  try {
    const response = await api.get(`/roster/${teamId}/shifts`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get shifts' };
  }
};

export const updateShifts = async (teamId, shifts) => {
  try {
    const response = await api.put(`/roster/${teamId}/shifts`, { shifts });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to update shifts' };
  }
};

// ==================== SHIFT REQUIREMENTS / CONFIG ====================
export const getShiftConfig = async (teamId) => {
  try {
    const response = await api.get(`/roster/${teamId}/config`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get shift config' };
  }
};

export const updateShiftConfig = async (teamId, config) => {
  try {
    const response = await api.put(`/roster/${teamId}/config`, config);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to update shift config' };
  }
};

// ==================== STATISTICS ====================
export const getRosterStatistics = async (teamId) => {
  try {
    const response = await api.get(`/roster/${teamId}/statistics`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get statistics' };
  }
};

// ==================== MEMBER ROSTER ====================
export const getMemberRoster = async (teamId, memberId, year, month) => {
  try {
    const response = await api.get(`/roster/${teamId}/member/${memberId}/${year}/${month}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get member roster' };
  }
};

export const getShiftFrequencyTable = async (teamId) => {
  try {
    const response = await api.get(`/roster/${teamId}/frequency-table`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get frequency table' };
  }
};

// ==================== SHIFT SWAPPING METHODS ====================

/**
 * Get available users for swapping on a specific day
 */
export const getAvailableSwapUsers = async (teamId, year, month, day, userId) => {
  try {
    const response = await api.get(`/roster/${teamId}/${year}/${month}/${day}/swap-available/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get available swap users' };
  }
};

/**
 * Swap shifts between two users
 */
export const swapShifts = async (teamId, year, month, day, userId1, userId2, swappedBy, reason = "") => {
  try {
    const response = await api.post(`/roster/${teamId}/${year}/${month}/${day}/swap`, {
      userId1,
      userId2,
      swappedBy,
      reason
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to swap shifts' };
  }
};

/**
 * Get swap history for a roster
 */
export const getSwapHistory = async (teamId, year, month) => {
  try {
    const response = await api.get(`/roster/${teamId}/${year}/${month}/swap-history`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to get swap history' };
  }
};

/**
 * Revert a specific swap
 */
export const revertSwap = async (teamId, year, month, swapId, revertedBy) => {
  try {
    const response = await api.post(`/roster/${teamId}/${year}/${month}/swap-revert/${swapId}`, {
      revertedBy
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to revert swap' };
  }
};

/**
 * Validate a swap before executing
 */
export const validateSwap = async (teamId, year, month, day, userId1, userId2) => {
  try {
    const response = await api.post(`/roster/${teamId}/${year}/${month}/${day}/validate-swap`, {
      userId1,
      userId2
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to validate swap' };
  }
};