// frontend/src/components/common/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, userType }) => {
  const token = localStorage.getItem('token');
  const storedUserType = localStorage.getItem('userType');

  if (!token) {
    toast.error('Please login to continue');
    return <Navigate to={userType === 'admin' ? '/admin/login' : '/login'} />;
  }

  if (storedUserType !== userType) {
    toast.error('Unauthorized access');
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;