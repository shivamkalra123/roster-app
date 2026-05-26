// frontend/src/components/dashboard/MemberDashboard.jsx
import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, History, LogOut, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';

const MemberDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('roster');
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [roster, setRoster] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    loadProfile();
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'roster') {
      loadRoster();
    }
  }, [selectedYear, selectedMonth, activeTab]);

  const loadProfile = async () => {
    try {
      const result = await memberService.getMyProfile();
      if (result.success) {
        setProfile(result.profile);
      }
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const loadHistory = async () => {
    try {
      const result = await memberService.getMyHistory();
      if (result.success) {
        setHistory(result.history);
      }
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async () => {
    setLoading(true);
    try {
      const result = await memberService.getMyRoster(selectedYear, selectedMonth);
      if (result.success) {
        setRoster(result.roster);
        setSchedule(result.roster.member?.schedule || {});
      }
    } catch (error) {
      toast.error(error.error || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getDayOfWeek = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    return date.toLocaleString('default', { weekday: 'short' });
  };

  const getShiftColor = (shiftId) => {
    const shift = roster?.shiftConfig?.shifts?.find(s => s.id === shiftId);
    if (shift?.color) {
      return `bg-[${shift.color}] text-white`;
    }
    const colors = {
      morning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      evening: 'bg-orange-100 text-orange-800 border-orange-200',
      night: 'bg-purple-100 text-purple-800 border-purple-200',
      OFF: 'bg-gray-100 text-gray-500 border-gray-200'
    };
    return colors[shiftId] || 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getShiftIcon = (shiftId) => {
    const icons = {
      morning: '🌅',
      evening: '🌇',
      night: '🌙',
      OFF: '❌'
    };
    return icons[shiftId] || '🕒';
  };

  const getShiftDisplayName = (shiftId) => {
    const shift = roster?.shiftConfig?.shifts?.find(s => s.id === shiftId);
    return shift?.name || shiftId || 'OFF';
  };

  const getShiftTimings = (shiftId) => {
    const shift = roster?.shiftConfig?.shifts?.find(s => s.id === shiftId);
    if (shift) {
      return `${shift.startTime} - ${shift.endTime}`;
    }
    return '';
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
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
    const headers = ['Date', 'Day', 'Shift', 'Timings'];
    const rows = days.map(day => {
      const shiftId = schedule[day] || 'OFF';
      const shiftName = getShiftDisplayName(shiftId);
      const timings = shiftId !== 'OFF' ? getShiftTimings(shiftId) : '-';
      return [
        `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        getDayOfWeek(selectedYear, selectedMonth, day),
        shiftName,
        timings
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster_${selectedYear}_${monthNames[selectedMonth - 1]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Roster downloaded!');
  };

  const tabs = [
    { id: 'roster', label: 'My Roster', icon: Calendar },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'history', label: 'Shift History', icon: History }
  ];

  if (loading && activeTab === 'roster') {
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
              <h1 className="text-2xl font-bold text-gray-900">Member Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {profile && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                  <p className="text-xs text-gray-500">{profile.email}</p>
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

      {/* Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 font-medium text-sm transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Roster Tab */}
        {activeTab === 'roster' && roster && (
          <div className="bg-white rounded-lg shadow">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  My Roster - {monthNames[selectedMonth - 1]} {selectedYear}
                </h3>
                <button
                  onClick={downloadRoster}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
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
                  {roster?.member?.totalDaysWorked || 0} days worked this month
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{roster?.member?.totalDaysWorked || 0}</p>
                <p className="text-sm text-gray-600">Days Worked</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{roster?.member?.assignedShift || 'N/A'}</p>
                <p className="text-sm text-gray-600">Current Shift</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {Object.keys(roster?.member?.shiftCounts || {}).length || 0}
                </p>
                <p className="text-sm text-gray-600">Shift Types</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {Object.values(roster?.member?.shiftCounts || {}).reduce((a, b) => a + b, 0) || 0}
                </p>
                <p className="text-sm text-gray-600">Total Shifts</p>
              </div>
            </div>

            {/* Calendar View */}
            <div className="overflow-x-auto p-4">
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() === 0 ? 6 : new Date(selectedYear, selectedMonth - 1, 1).getDay() - 1 }, (_, i) => (
                  <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg"></div>
                ))}
                
                {days.map(day => {
                  const shiftId = schedule[day] || 'OFF';
                  const shiftName = getShiftDisplayName(shiftId);
                  const shiftColor = getShiftColor(shiftId);
                  const shiftIcon = getShiftIcon(shiftId);
                  const timings = shiftId !== 'OFF' ? getShiftTimings(shiftId) : '';
                  const isWeekend = getDayOfWeek(selectedYear, selectedMonth, day) === 'Sat' || getDayOfWeek(selectedYear, selectedMonth, day) === 'Sun';
                  
                  return (
                    <div
                      key={day}
                      className={`h-24 border rounded-lg p-2 ${isWeekend ? 'bg-red-50' : 'bg-white'} hover:shadow-md transition`}
                    >
                      <div className="font-bold text-gray-700 text-sm">{day}</div>
                      {shiftId !== 'OFF' ? (
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${shiftColor}`}>
                            <span>{shiftIcon}</span>
                            {shiftName}
                          </span>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timings}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-400 text-center">OFF</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex flex-wrap gap-4 items-center">
                <span className="text-sm font-semibold text-gray-700">Legend:</span>
                {roster?.shiftConfig?.shifts?.map(shift => (
                  <div key={shift.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: shift.color }}></div>
                    <span className="text-sm text-gray-600">{shift.name}</span>
                    <span className="text-xs text-gray-400">({shift.startTime}-{shift.endTime})</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600">Day Off</span>
                </div>
              </div>
            </div>
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

// Add default export at the end
export default MemberDashboard;