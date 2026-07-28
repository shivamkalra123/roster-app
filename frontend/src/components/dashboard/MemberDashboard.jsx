// frontend/src/components/dashboard/MemberDashboard.jsx

import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, History, LogOut, Download } from 'lucide-react';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';
import RosterViewer from '../../../../shared/components/RosterViewer';
import { useAuth } from '../../contexts/AuthContext';

const MemberDashboard = ({ onLogout }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState(null);
  const [rosterArray, setRosterArray] = useState([]);
  // Helper: process roster data for table/grid
  const processRosterData = (data) => {
    const roster = data.roster?.roster ?? data.roster ?? {};
    const days = Object.keys(roster).sort((a, b) => new Date(a) - new Date(b));

    const memberMap = new Map();
    days.forEach(day => {
      (roster[day] || []).forEach(assignment => {
        if (!memberMap.has(assignment.userId)) {
          memberMap.set(assignment.userId, {
            userId: assignment.userId,
            name: assignment.name,
            isWeekendWorker: assignment.isWeekendWorker || false,
          });
        }
      });
    });

    const members = Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const rosterGrid = members.map(member => {
      const memberSchedule = {};
      const memberShiftDetails = {};

      days.forEach(day => {
        const assignment = (roster[day] || []).find(a => a.userId === member.userId);
        memberSchedule[day] = assignment?.shift || 'OFF';
        memberShiftDetails[day] = assignment || null;
      });

      const shiftCounts = {};
      Object.values(memberSchedule).forEach(shift => {
        if (shift !== 'OFF') {
          shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
        }
      });

      return {
        memberId: member.userId,
        memberName: member.name,
        schedule: memberSchedule,
        shiftDetails: memberShiftDetails,
        shiftCounts,
        isWeekendWorker: member.isWeekendWorker,
      };
    });

    setRosterArray(rosterGrid);
  };
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Initialize with current date
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const [activeTab, setActiveTab] = useState('roster');
  const [profile] = useState(null);
  const [history] = useState([]);

  useEffect(() => {
    console.log('AUTH USER:', user);

    // Check if user exists and has teamId
    if (!user || !user.teamId) {
      console.log('No team found or user not authenticated');
      return;
    }

    // Make sure we have valid year and month
    if (!selectedYear || !selectedMonth) {
      console.log('Invalid year or month:', { selectedYear, selectedMonth });
      return;
    }

    console.log('Team found:', user.teamId);
    console.log('Loading roster for:', { 
      teamId: user.teamId, 
      year: selectedYear, 
      month: selectedMonth 
    });

    loadRoster();

  }, [selectedYear, selectedMonth, user]); // Keep all dependencies

  const loadRoster = async () => {
    try {
      setLoading(true);
      const teamId = user?.teamId;

      // Double-check values before making the call
      if (!teamId || !selectedYear || !selectedMonth) {
        console.error('Missing required values:', { teamId, selectedYear, selectedMonth });
        toast.error('Missing required information to load roster');
        return;
      }

      console.log('Calling getMyRoster with:', {
        teamId,
        selectedYear,
        selectedMonth,
      });

      const result = await memberService.getMyRoster(
        teamId,
        selectedYear,
        selectedMonth
      );

      console.log('FULL API RESULT:', result);

      if (result?.success) {
        setRoster(result);
        processRosterData(result);
      }

    } catch (error) {
      console.error(
        'Failed to load roster:',
        error?.response?.data || error
      );

      toast.error(
        error?.response?.data?.error ||
        error?.message ||
        'Failed to get roster'
      );

    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Team Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user.email}
                  </p>
                </div>
              )}

              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Month Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <button
            onClick={goToPreviousMonth}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            ← Previous
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Roster Tab */}
        {activeTab === 'roster' && roster && (
          <div className="w-full">
            <RosterViewer
              roster={roster}
              rows={rosterArray}
              shiftConfig={roster?.shiftConfig}
              showDownloadButton
            />
          </div>
        )}

        {activeTab === 'roster' && !roster && !loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No roster data available for this month.</p>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && profile && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-lg font-medium text-gray-900">{profile.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email Address</label>
                  <p className="mt-1 text-lg font-medium text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Current Shift</label>
                  <p className="mt-1 text-lg font-medium text-gray-900">{profile.currentShift || 'Not Assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Team</label>
                  <p className="mt-1 text-lg font-medium text-gray-900">{profile.teamName || 'Team Member'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Weekly Off Days</label>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {profile.weeklyOffDays?.map(day => (
                      <span key={day} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        {day} OFF
                      </span>
                    ))}
                    {(!profile.weeklyOffDays || profile.weeklyOffDays.length === 0) && (
                      <span className="text-sm text-gray-500">None set</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Member Since</label>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && history && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Shift History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Worked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weekend Worker</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.length > 0 ? (
                    history.map((entry, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(entry.year, entry.month - 1, 1).toLocaleString('default', { month: 'long' })} {entry.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {entry.shiftId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.daysWorked}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.isWeekendWorker ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Yes</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No shift history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MemberDashboard;
