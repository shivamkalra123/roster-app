// src/components/Team/TeamList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamService } from '../../services/teamService'; // Change this line
import { Users, Calendar, ArrowRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamList = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const result = await teamService.getTeams(); // Change this line
      if (result.success) {
        setTeams(result.teams || []);
      }
    } catch (error) {
      toast.error('Failed to fetch teams');
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

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Teams Yet</h3>
          <p className="text-gray-600 mb-6">Create your first team to get started</p>
          <Link
            to="/teams/create"
            className="inline-block bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Create Team
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Teams</h2>
        <Link
          to="/teams/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Team
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Link
            key={team.teamId}
            to={`/teams/${team.teamId}`}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{team.name}</h3>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-sm">{team.memberCount || 0} Members</span>
                </div>
                
                {team.pendingCount > 0 && (
                  <div className="flex items-center text-orange-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">{team.pendingCount} Pending Invites</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TeamList;