// frontend/src/components/Team/TeamDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamService } from '../../services/teamService';
import MemberList from '../Members/MemberList';
import RosterManagement from '../Roster/RosterManagement';
import TeamSettings from './TeamSettings';
import { ArrowLeft, Users, Calendar, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamDashboard = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    fetchTeamDetails();
  }, [teamId]);

  const fetchTeamDetails = async () => {
    try {
      const result = await teamService.getTeamDetails(teamId);
      if (result.success) {
        setTeam(result.team);
      } else {
        toast.error('Team not found');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to fetch team details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{team?.name}</h1>
              <p className="text-gray-600 mt-1">
                Team ID: {teamId}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {team?.memberCount || 0} Members
            </div>
            {team?.pendingCount > 0 && (
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                {team.pendingCount} Pending
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-1 font-medium text-sm transition ${
              activeTab === 'members'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 px-1 font-medium text-sm transition ${
              activeTab === 'roster'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="inline h-4 w-4 mr-2" />
            Roster Management
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 font-medium text-sm transition ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="inline h-4 w-4 mr-2" />
            Settings
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'members' && <MemberList teamId={teamId} />}
        {activeTab === 'roster' && <RosterManagement teamId={teamId} />}
        {activeTab === 'settings' && <TeamSettings teamId={teamId} />}
      </div>
    </div>
  );
};

export default TeamDashboard;