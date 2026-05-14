// frontend/src/pages/AcceptInvite.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { teamService } from '../services/teamService';
import toast from 'react-hot-toast';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');
  const teamId = searchParams.get('teamId');

  useEffect(() => {
    if (!token || !teamId) {
      toast.error('Invalid invitation link');
      navigate('/login');
    }
  }, [token, teamId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await teamService.acceptInvite({
        token: token,
        teamId: teamId,
        name: formData.name,
        password: formData.password
      });

      if (result.success) {
        toast.success('Successfully joined the team!');
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('teamId', result.user.teamId);
        navigate('/member/dashboard');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Accept Invitation</h1>
          <p className="text-gray-600 mt-2">Join your team to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Your Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Create a password (min 6 characters)"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Accept Invitation & Join Team'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login here</a></p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;