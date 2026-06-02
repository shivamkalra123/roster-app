import api from './api';
export const getTeamLeaves =
  async (teamId) => {

    const response =
      await api.get(
        `/leave/team/${teamId}`
      );

    return response.data;
  };

// ================= UPDATE STATUS =================
export const updateLeaveStatus =
  async (
    leaveId,
    data
  ) => {

    const response =
      await api.patch(
        `/leave/${leaveId}`,
        data
      );

    return response.data;
  };