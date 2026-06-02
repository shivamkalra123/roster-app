import api from './api';
export const applyLeave = async (data) => {
  try {

    const response = await api.post(
      '/leave/apply',
      data
    );

    return response.data;

  } catch (error) {

    console.error(
      'Apply Leave Service Error:',
      error?.response?.data || error
    );

    throw error;
  }
};

// ================= GET MY LEAVES =================
export const getMyLeaves = async () => {
  try {

    const response =
      await api.get('/leave/my');

    return response.data;

  } catch (error) {

    console.error(
      'Get My Leaves Error:',
      error?.response?.data || error
    );

    throw error;
  }
};