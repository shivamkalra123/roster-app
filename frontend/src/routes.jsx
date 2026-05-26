// frontend/src/routes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<UserLogin />} />
      <Route path="/register" element={<UserRegister />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute userType="member">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Remove any admin routes from here - they belong in admin app */}
    </Routes>
  );
};

export default AppRoutes;