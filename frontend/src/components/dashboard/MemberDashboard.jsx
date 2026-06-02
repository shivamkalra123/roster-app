// frontend/src/components/dashboard/MemberDashboard.jsx

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import ApplyLeaveModal from '../Leave/ApplyLeaveModal';

import { getTeamRoster } from '../../services/rosterService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

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

        <div className="bg-white rounded-lg shadow">

          {/* Top Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg">

            <div className="flex justify-between items-center">

              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />

                Team Roster - {monthNames[selectedMonth - 1]}{' '}
                {selectedYear}
              </h3>
<button
  onClick={() => setShowLeaveModal(true)}
  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition flex items-center gap-2 text-sm"
>
  <Calendar className="h-4 w-4" />
  Apply Leave
</button>
              <button
                onClick={downloadRoster}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <ApplyLeaveModal
  isOpen={showLeaveModal}
  onClose={() => setShowLeaveModal(false)}
  teamId={user?.teamId}
/>

            </div>

            <div className="flex justify-between items-center mt-3">

              <div className="flex gap-2">

                <button
                  onClick={goToPreviousMonth}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={goToNextMonth}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

              </div>

              <p className="text-blue-100 text-sm">
                {schedule.length} team members
              </p>

            </div>
          </div>

          {/* TEAM ROSTER */}
          <div className="overflow-x-auto max-h-[70vh]">

  <table className="min-w-full border-collapse">

    {/* HEADER */}
    <thead className="sticky top-0 z-20">

      <tr className="bg-gray-100 border-b">

        <th className="sticky left-0 bg-gray-100 z-30 px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r w-48">
          Team Member
        </th>

        {days.map((day) => {

          const date = new Date(
            selectedYear,
            selectedMonth - 1,
            day
          );

          const dayOfWeek =
            date.toLocaleString('default', {
              weekday: 'short'
            });

          const isWeekend =
            date.getDay() === 0 ||
            date.getDay() === 6;

          return (
            <th
              key={day}
              className={`px-2 py-3 text-center text-sm font-medium min-w-[55px]
              ${isWeekend ? 'bg-red-100' : 'bg-gray-100'}`}
            >

              <div className="font-bold text-gray-700">
                {day}
              </div>

              <div
                className={`text-xs ${
                  isWeekend
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {dayOfWeek}
              </div>

            </th>
          );
        })}

      </tr>

    </thead>

    {/* BODY */}
    <tbody>

      {schedule.map((member) => (

        <tr
          key={member.userId}
          className="border-b hover:bg-gray-50"
        >

          {/* MEMBER NAME */}
          <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-gray-800 border-r whitespace-nowrap">

            {member.name}

          </td>

          {/* DAYS */}
          {days.map((day) => {

            const shiftId =
              member.schedule?.[day] || 'OFF';

            const shiftName =
              getShiftDisplayName(shiftId);

            const shiftStyle =
              getShiftColor(shiftId);

            return (
              <td
                key={day}
                className="px-2 py-2 text-center"
              >

                <span
                  className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full border min-w-[60px]"
                  style={shiftStyle}
                >

                  {shiftName}

                </span>

              </td>
            );
          })}

        </tr>

      ))}

    </tbody>

  </table>

</div>

        </div>
      </main>
    </div>
  );
};

export default MemberDashboard;