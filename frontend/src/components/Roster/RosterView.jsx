// frontend/src/components/Roster/RosterView.jsx
import React, { useState, useEffect } from 'react';
import { getTeamRoster } from '../../services/rosterService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const RosterView = ({ teamId, year, month }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState(null);
  const [schedule, setSchedule] = useState({});

  useEffect(() => {
    if (teamId && year && month) {
      loadRoster();
    }
  }, [teamId, year, month]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const result = await getTeamRoster(teamId, year, month);
      if (result.success) {
        setRoster(result.roster);
        // Get current user's schedule
        const userSchedule = result.roster.userSchedules?.find(s => s.userId === user?.id);
        setSchedule(userSchedule?.schedule || {});
      }
    } catch (error) {
      toast.error(error.error || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const getShiftName = (shiftId) => {
    const shift = roster?.shiftConfig?.shifts?.find(s => s.id === shiftId);
    return shift?.name || shiftId || 'OFF';
  };

  const getShiftColor = (shiftId) => {
    const shift = roster?.shiftConfig?.shifts?.find(s => s.id === shiftId);
    if (shift?.color) {
      return { backgroundColor: shift.color, color: '#fff' };
    }
    return { backgroundColor: '#e5e7eb', color: '#374151' };
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h3 className="text-xl font-bold text-white">
          Roster - {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
        </h3>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
          
          {days.map(day => {
            const shiftId = schedule[day] || 'OFF';
            const shiftName = getShiftName(shiftId);
            const shiftStyle = getShiftColor(shiftId);
            const date = new Date(year, month - 1, day);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            return (
              <div
                key={day}
                className={`border rounded-lg p-2 min-h-24 ${isWeekend ? 'bg-red-50' : 'bg-white'}`}
              >
                <div className="font-bold text-gray-700">{day}</div>
                {shiftId !== 'OFF' ? (
                  <div
                    className="mt-1 text-xs font-semibold p-1 rounded text-center"
                    style={shiftStyle}
                  >
                    {shiftName}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-gray-400 text-center">OFF</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RosterView;