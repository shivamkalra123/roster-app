import api from './api';

// ================= GET TEAM ROSTER =================
export const getTeamRoster = async (
  teamId,
  year,
  month
) => {
  try {
    console.log(
      `📤 API Request: GET /roster/${teamId}/rosters/${year}/${month}`
    );

    const response = await api.get(
      `/roster/${teamId}/rosters/${year}/${month}`
    );

    return response.data;

  } catch (error) {
    console.error(
      'Roster Service Error:',
      error?.response?.data || error
    );

    throw error;
  }
};