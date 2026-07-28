// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import UserLogin from './pages/UserLogin';
import Dashboard from './pages/Dashboard';
import AcceptInvite from './pages/AcceptInvite';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster po sition="top-right" />
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute userType="member">
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <footer className="border-t border-gray-200 bg-white px-4 py-4 text-center text-sm text-gray-500">
            Fair shifts, unfair sleep schedules <br/>
            <br/>
            Made With Love by Shivam Kalra. 
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
