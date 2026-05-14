// frontend/src/components/Team/CreateTeam.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamService } from '../../services/teamService';
import toast from 'react-hot-toast';

const CreateTeam = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast.error('Team name is required');
      return;
    }
    
    setLoading(true);
    
    const emails = memberEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email);
    
    try {
      const result = await teamService.createTeam({
        name: teamName,
        memberEmails: emails
      });
      
      if (result.success) {
        toast.success(result.message || 'Team created successfully!');
        navigate(`/teams/${result.teamId}`);
      }
    } catch (error) {
      toast.error(error.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Team</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Team Name *
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Development Team"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Initial Members (Optional)
            </label>
            <textarea
              value={memberEmails}
              onChange={(e) => setMemberEmails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Enter email addresses separated by commas&#10;e.g., john@example.com, jane@example.com"
            />
            <p className="text-sm text-gray-500 mt-1">
              Members will receive email invitations to join the team
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;