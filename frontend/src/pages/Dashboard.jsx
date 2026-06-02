  // frontend/src/pages/Dashboard.jsx
  import React from 'react';
  import { useNavigate } from 'react-router-dom';
  import MemberDashboard from '../components/dashboard/MemberDashboard';
  import toast from 'react-hot-toast';

  const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      toast.success('Logged out successfully');
      navigate('/login');
    };

    return <MemberDashboard onLogout={handleLogout} />;
  };

  export default Dashboard;