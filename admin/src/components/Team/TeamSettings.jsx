// frontend/src/components/Team/TeamSettings.jsx
import React, { useState, useEffect } from 'react';
import { getShiftConfig, updateShiftConfig, getRosterStatistics, getMembers, updateMemberWeeklyOff, updateMemberShiftAssignment, autoAssignMemberShifts } from '../../services/rosterService';
import { Save, Plus, Trash2, Clock, Users, Calendar, AlertCircle, User, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

// Member Shift Assignment Component
const MemberShiftAssignment = ({ teamId, member, availableShifts, onUpdate }) => {
  const [selectedShiftId, setSelectedShiftId] = useState(member.assignedShiftId || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedShiftId) {
      toast.error('Please select a shift');
      return;
    }

    setSaving(true);
    try {
      const result = await updateMemberShiftAssignment(teamId, member.userId, selectedShiftId);
      if (result.success) {
        toast.success(`Shift assigned to ${member.name}`);
        onUpdate();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to assign shift');
    } finally {
      setSaving(false);
    }
  };

  const selectedShift = availableShifts.find(s => s.id === selectedShiftId);

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-500" />
            <div>
              <span className="font-semibold text-gray-800">{member.name}</span>
              <span className="text-sm text-gray-500 ml-2">({member.email})</span>
            </div>
            {member.assignedShiftId && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Current: {member.assignedShiftName}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedShiftId}
            onChange={(e) => setSelectedShiftId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">-- Select Shift --</option>
            {availableShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.startTime} - {shift.endTime})
              </option>
            ))}
          </select>

          <button
            onClick={handleSave}
            disabled={saving || !selectedShiftId}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Assign Shift'}
          </button>
        </div>
      </div>

      {selectedShift && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <Clock className="h-4 w-4" />
          <span>Timings: {selectedShift.startTime} - {selectedShift.endTime}</span>
        </div>
      )}
    </div>
  );
};

const TeamSettings = ({ teamId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shiftConfig, setShiftConfig] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [activeSection, setActiveSection] = useState('shifts');
  const [autoAssigning, setAutoAssigning] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [teamId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const configResult = await getShiftConfig(teamId);
      if (configResult.success) {
        setShiftConfig(configResult.config);
      }
      
      const statsResult = await getRosterStatistics(teamId);
      if (statsResult.success) {
        setStatistics(statsResult.statistics);
      }

      const membersResult = await getMembers(teamId);
      if (membersResult.success) {
        setMembers(membersResult.members);
        setPendingChanges({});
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const result = await updateShiftConfig(teamId, shiftConfig);
      if (result.success) {
        toast.success('Shift configuration saved successfully');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeeklyOff = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      for (const [memberId, offDays] of Object.entries(pendingChanges)) {
        await updateMemberWeeklyOff(teamId, memberId, offDays);
      }
      
      const updatedMembers = members.map(member => {
        if (pendingChanges[member.userId]) {
          return { ...member, weeklyOffDays: pendingChanges[member.userId] };
        }
        return member;
      });
      setMembers(updatedMembers);
      setPendingChanges({});
      toast.success('Weekly off days saved successfully');
    } catch (error) {
      toast.error('Failed to save weekly off days');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAssignShifts = async () => {
    if (!window.confirm('Auto-assign shifts for all members based on past history and current timing rotation?')) {
      return;
    }

    setAutoAssigning(true);
    try {
      const result = await autoAssignMemberShifts(teamId);
      if (result.success) {
        toast.success(`Auto-assigned shifts for ${result.totalUsers} member(s)`);
        await loadSettings();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to auto assign shifts');
    } finally {
      setAutoAssigning(false);
    }
  };

  const toggleOffDay = (memberId, day) => {
    const member = members.find(m => m.userId === memberId);
    const currentOffDays = pendingChanges[memberId] !== undefined 
      ? pendingChanges[memberId] 
      : (member?.weeklyOffDays || []);
    
    let newOffDays;
    if (currentOffDays.includes(day)) {
      newOffDays = currentOffDays.filter(d => d !== day);
    } else {
      newOffDays = [...currentOffDays, day];
    }
    
    setPendingChanges({
      ...pendingChanges,
      [memberId]: newOffDays
    });
  };

  const getCurrentOffDays = (memberId) => {
    if (pendingChanges[memberId] !== undefined) {
      return pendingChanges[memberId];
    }
    const member = members.find(m => m.userId === memberId);
    return member?.weeklyOffDays || [];
  };

  const updateShift = (index, field, value) => {
    const updatedShifts = [...shiftConfig.shifts];
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    setShiftConfig({ ...shiftConfig, shifts: updatedShifts });
  };

  const addShift = () => {
    const newShift = {
      id: `shift_${Date.now()}`,
      type: 'custom',
      name: 'New Shift',
      startTime: '09:00',
      endTime: '17:00',
      color: '#808080'
    };

    setShiftConfig({
      ...shiftConfig,
      shifts: [...shiftConfig.shifts, newShift],
      quotas: { ...shiftConfig.quotas, [newShift.id]: 1 },
      maxConsecutiveMonths: { ...shiftConfig.maxConsecutiveMonths, [newShift.id]: 3 }
    });
  };

  const removeShift = (index) => {
    const shiftId = shiftConfig.shifts[index].id;
    const updatedShifts = shiftConfig.shifts.filter((_, i) => i !== index);
    const updatedQuotas = { ...shiftConfig.quotas };
    const updatedMaxMonths = { ...shiftConfig.maxConsecutiveMonths };
    delete updatedQuotas[shiftId];
    delete updatedMaxMonths[shiftId];
    
    setShiftConfig({
      ...shiftConfig,
      shifts: updatedShifts,
      quotas: updatedQuotas,
      maxConsecutiveMonths: updatedMaxMonths
    });
  };

  const updateQuota = (shiftId, value) => {
    setShiftConfig({
      ...shiftConfig,
      quotas: { ...shiftConfig.quotas, [shiftId]: parseInt(value) || 0 }
    });
  };

  const updateMaxMonths = (shiftId, value) => {
    setShiftConfig({
      ...shiftConfig,
      maxConsecutiveMonths: { ...shiftConfig.maxConsecutiveMonths, [shiftId]: parseInt(value) || 1 }
    });
  };

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Team Settings</h2>
        <p className="text-gray-600">Configure shift schedules, member weekly off days, shift assignments, and rotation rules</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveSection('shifts')}
            className={`pb-3 px-1 font-medium text-sm transition whitespace-nowrap ${
              activeSection === 'shifts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="inline h-4 w-4 mr-2" />
            Shift Timings
          </button>
         
          <button
            onClick={() => setActiveSection('shiftAssignment')}
            className={`pb-3 px-1 font-medium text-sm transition whitespace-nowrap ${
              activeSection === 'shiftAssignment'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Assign Shifts
          </button>
          <button
            onClick={() => setActiveSection('weeklyOff')}
            className={`pb-3 px-1 font-medium text-sm transition whitespace-nowrap ${
              activeSection === 'weeklyOff'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays className="inline h-4 w-4 mr-2" />
            Weekly Off Days
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`pb-3 px-1 font-medium text-sm transition whitespace-nowrap ${
              activeSection === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="inline h-4 w-4 mr-2" />
            Member History
          </button>
        </nav>
      </div>

      {/* Shift Timings Section */}
      {activeSection === 'shifts' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Shift Timings</h3>
            <button
              onClick={addShift}
              className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition flex items-center gap-1 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Shift
            </button>
          </div>

          <div className="space-y-4">
            {shiftConfig?.shifts.map((shift, index) => (
              <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift ID</label>
                    <input type="text" value={shift.id} onChange={(e) => updateShift(index, 'id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift Type</label>
                    <select value={shift.type || ''} onChange={(e) => updateShift(index, 'type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="morning">Morning</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                    <input type="text" value={shift.name} onChange={(e) => updateShift(index, 'name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="time" value={shift.startTime} onChange={(e) => updateShift(index, 'startTime', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="time" value={shift.endTime} onChange={(e) => updateShift(index, 'endTime', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={shift.color || '#808080'} onChange={(e) => updateShift(index, 'color', e.target.value)} className="h-10 w-20 border border-gray-300 rounded-lg" />
                      <button onClick={() => removeShift(index)} className="text-red-600 hover:text-red-800" disabled={shift.id === 'morning_1' || shift.id === 'evening_1' || shift.id === 'night_1'}>
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={handleSaveConfig} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Shift Timings'}
            </button>
          </div>
        </div>
      )}

      {/* Shift Quotas Section */}
      {activeSection === 'quotas' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Shift Quotas & Rotation Rules</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required People</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Consecutive Months</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Assignment</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shiftConfig?.shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }}></div>
                        <span className="font-medium">{shift.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" min="0" max="20" value={shiftConfig.quotas?.[shift.id] || 0} onChange={(e) => updateQuota(shift.id, e.target.value)} className="w-24 px-3 py-1 border border-gray-300 rounded-lg" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="number" min="1" max="12" value={shiftConfig.maxConsecutiveMonths?.[shift.id] || 3} onChange={(e) => updateMaxMonths(shift.id, e.target.value)} className="w-24 px-3 py-1 border border-gray-300 rounded-lg" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {statistics?.currentAssignments?.filter(a => a.currentShift === shift.id).length || 0} members
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={handleSaveConfig} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Quotas'}
            </button>
          </div>
        </div>
      )}

      {/* Assign Shifts Section */}
      {activeSection === 'shiftAssignment' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Assign Shifts to Members</h3>
          <p className="text-sm text-gray-500 mb-4">
            Assign a specific shift to each member, or let the system auto-assign based on past history and shift timing rotation.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoAssignShifts}
              disabled={autoAssigning || !members.length}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                autoAssigning || !members.length
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Users className="h-4 w-4" />
              {autoAssigning ? 'Auto-assigning...' : 'Auto Assign Shifts'}
            </button>
            <span className="text-sm text-gray-500">
              Uses previous shift history, current assignment, and shift start times.
            </span>
          </div>
          
          <div className="space-y-4">
            {members.map((member) => (
              <MemberShiftAssignment
                key={member.userId}
                teamId={teamId}
                member={member}
                availableShifts={shiftConfig?.shifts || []}
                onUpdate={loadSettings}
              />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Off Days Section */}
      {activeSection === 'weeklyOff' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Member Weekly Off Days</h3>
            {Object.keys(pendingChanges).length > 0 && (
              <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                {Object.keys(pendingChanges).length} member(s) have unsaved changes
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">Set which days each member has off each week. Green = Working, Red = Off. Click Save at the bottom to apply all changes.</p>
          
          <div className="space-y-4">
            {members.map((member) => {
              const currentOffDays = getCurrentOffDays(member.userId);
              const hasChanges = pendingChanges[member.userId] !== undefined;
              
              return (
                <div key={member.userId} className={`border rounded-lg p-4 ${hasChanges ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <User className="h-5 w-5 text-gray-500" />
                    <span className="font-semibold text-gray-800">{member.name}</span>
                    <span className="text-sm text-gray-500">({member.email})</span>
                    {hasChanges && <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">Unsaved</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {daysOfWeek.map(day => {
                      const isOff = currentOffDays.includes(day);
                      return (
                        <button key={day} onClick={() => toggleOffDay(member.userId, day)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${isOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                          {day} {isOff ? 'OFF' : 'ON'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About Weekly Off Days:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click on a day to toggle between ON (working) and OFF</li>
                  <li>Members will only be scheduled on their ON days</li>
                  <li>Each member should have exactly 2 off days per week for 5-day work week</li>
                  <li>Click "Save Weekly Off Days" to apply all changes at once</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {Object.keys(pendingChanges).length > 0 && (
              <button onClick={() => setPendingChanges({})} disabled={saving} className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition">
                Cancel Changes
              </button>
            )}
            <button onClick={handleSaveWeeklyOff} disabled={saving || Object.keys(pendingChanges).length === 0} className={`px-6 py-2 rounded-lg transition flex items-center gap-2 ${saving || Object.keys(pendingChanges).length === 0 ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Weekly Off Days'}
            </button>
          </div>
        </div>
      )}

      {/* Member History Section */}
      {activeSection === 'history' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Member Shift History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Shift</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weekly Off Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months per Shift</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.userId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {member.currentShift || 'Not Assigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {member.weeklyOffDays?.map(day => <span key={day} className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">{day} OFF</span>)}
                          {daysOfWeek.filter(day => !member.weeklyOffDays?.includes(day)).map(day => <span key={day} className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{day}</span>)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(member.monthsPerShift || {}).map(([shiftId, months]) => <span key={shiftId} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{shiftId}: {months} month{months !== 1 ? 's' : ''}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No members found in this team</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSettings;
