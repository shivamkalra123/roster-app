// frontend/src/components/dashboard/MemberDashboard.jsx

import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, History, LogOut, Download } from 'lucide-react';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';
import RosterCalendar from '../../../../shared/components/RosterCalendar';

const MemberDashboard = ({ onLogout }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState(null);

  // FULL TEAM SCHEDULE ARRAY
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [schedule, setSchedule] = useState([]);

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  useEffect(() => {
    console.log('AUTH USER:', user);

    if (!user) return;

    const teamId = user?.teamId;

    if (!teamId) {
      console.log('No team found');
      return;
    }

    console.log('Team found:', teamId);

    loadRoster();

  }, [selectedYear, selectedMonth, user]);

  const loadRoster = async () => {
    try {
      setLoading(true);

      const teamId = user?.teamId;

      console.log(
        `Fetching roster for team: ${teamId}, ${selectedYear}-${selectedMonth}`
      );

      const result = await getTeamRoster(
        teamId,
        selectedYear,
        selectedMonth
      );

      console.log('FULL API RESULT:', result);
      console.log('ROSTER:', result?.roster);

      console.log(
        'USER SCHEDULES:',
        result?.roster?.userSchedules
      );

      if (result?.success) {
        setRoster(result.roster);

        // STORE FULL TEAM
        setSchedule(
          result?.roster?.userSchedules || []
        );
      }

    } catch (error) {
      console.error(
        'Failed to load roster:',
        error?.response?.data || error
      );

      toast.error(
        error?.response?.data?.error ||
        'Failed to get roster'
      );

    } finally {
      setLoading(false);
    }
  };

  const getShiftDisplayName = (shiftId) => {

  if (shiftId === 'LEAVE') {
    return '🏖️ Leave';
  }
  

  if (shiftId === 'HOLIDAY') {
    return '🎉 Holiday';
  }

  if (shiftId === 'OFF') {
    return 'OFF';
  }

  const shift =
    roster?.shiftConfig?.shifts?.find(
      (s) => s.id === shiftId
    );

  return (
    shift?.name ||
    shiftId ||
    'OFF'
  );
};

  const getShiftColor = (shiftId) => {
    const shift = roster?.shiftConfig?.shifts?.find(
      (s) => s.id === shiftId
    );

    if (shift?.color) {
      return {
        backgroundColor: shift.color,
        color: '#fff'
      };
    }

    return {
      backgroundColor: '#e5e7eb',
      color: '#374151'
    };
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(
    selectedYear,
    selectedMonth
  );

  const days = Array.from(
    { length: daysInMonth },
    (_, i) => i + 1
  );

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

  const downloadRoster = () => {
    const csvRows = [];

    // Header row
    csvRows.push([
      'Employee',
      ...days.map((d) => `Day ${d}`)
    ]);

    // Data rows
    schedule.forEach((member) => {
      const row = [
        member.name
      ];

      days.forEach((day) => {
        row.push(
          member.schedule?.[day] || 'OFF'
        );
      });

      csvRows.push(row);
    });

    const csvContent = csvRows
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob(
      [csvContent],
      { type: 'text/csv' }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `team_roster_${selectedYear}_${selectedMonth}.csv`;

    a.click();

    URL.revokeObjectURL(url);

    toast.success('Roster downloaded!');
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

          <div className="flex justify-between items-center">

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

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Roster Tab */}
        {activeTab === 'roster' && roster && (
          <RosterCalendar
            layout="member"
            title={`My Roster - ${monthNames[selectedMonth - 1]} ${selectedYear}`}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            days={days}
            schedule={schedule}
            shiftConfig={roster?.shiftConfig}
            summaryText={`${roster?.member?.totalDaysWorked || 0} days worked this month`}
            summaryCards={[
              {
                label: 'Days Worked',
                value: roster?.member?.totalDaysWorked || 0,
                className: 'bg-blue-50',
              },
              {
                label: 'Current Shift',
                value: roster?.member?.assignedShift || 'N/A',
                className: 'bg-green-50',
              },
              {
                label: 'Shift Types',
                value: Object.keys(roster?.member?.shiftCounts || {}).length || 0,
                className: 'bg-purple-50',
              },
              {
                label: 'Total Shifts',
                value: Object.values(roster?.member?.shiftCounts || {}).reduce((a, b) => a + b, 0) || 0,
                className: 'bg-orange-50',
              },
            ]}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            onDownload={downloadRoster}
            showDownloadButton
            showNavigation
            showSummaryCards
            showLegend
          />
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