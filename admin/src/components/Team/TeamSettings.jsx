// frontend/src/components/Team/TeamSettings.jsx
import React, { useState, useEffect } from 'react';
import { getShiftConfig, updateShiftConfig, getRosterStatistics } from '../../services/rosterService';
import { memberService } from '../../services/memberService';
import { Save, Plus, Trash2, Clock, Users, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TeamSettings = ({ teamId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shiftConfig, setShiftConfig] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [activeSection, setActiveSection] = useState('shifts'); // shifts, quotas, history

  useEffect(() => {
    loadSettings();
  }, [teamId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Load shift configuration
      const configResult = await getShiftConfig(teamId);
      if (configResult.success) {
        setShiftConfig(configResult.config);
      }
      
      // Load statistics
      const statsResult = await getRosterStatistics(teamId);
      if (statsResult.success) {
        setStatistics(statsResult.statistics);
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

  const updateShift = (index, field, value) => {
    const updatedShifts = [...shiftConfig.shifts];
    updatedShifts[index] = { ...updatedShifts[index], [field]: value };
    setShiftConfig({ ...shiftConfig, shifts: updatedShifts });
  };

  const addShift = () => {
    const newShift = {
      id: `shift_${Date.now()}`,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Team Settings</h2>
        <p className="text-gray-600">Configure shift schedules, quotas, and rotation rules</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveSection('shifts')}
            className={`pb-3 px-1 font-medium text-sm transition ${
              activeSection === 'shifts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="inline h-4 w-4 mr-2" />
            Shift Timings
          </button>
          <button
            onClick={() => setActiveSection('quotas')}
            className={`pb-3 px-1 font-medium text-sm transition ${
              activeSection === 'quotas'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Shift Quotas
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`pb-3 px-1 font-medium text-sm transition ${
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Name
                    </label>
                    <input
                      type="text"
                      value={shift.name}
                      onChange={(e) => updateShift(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) => updateShift(index, 'startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) => updateShift(index, 'endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={shift.color || '#808080'}
                        onChange={(e) => updateShift(index, 'color', e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => removeShift(index)}
                        className="text-red-600 hover:text-red-800 ml-auto"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required People per Month</th>
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
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={shiftConfig.quotas[shift.id] || 0}
                        onChange={(e) => updateQuota(shift.id, e.target.value)}
                        className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={shiftConfig.maxConsecutiveMonths[shift.id] || 3}
                        onChange={(e) => updateMaxMonths(shift.id, e.target.value)}
                        className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {statistics?.currentAssignments?.filter(a => a.currentShift === shift.id).length || 0} members
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About Shift Quotas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Required People: How many team members should be assigned to this shift each month</li>
                  <li>Max Consecutive Months: Maximum months a person can work this shift in a row</li>
                  <li>The system will automatically rotate members based on their history</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Quotas'}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months per Shift</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last 3 Months</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics?.membersCount > 0 ? (
                  Object.entries(statistics.shiftHistory || {}).map(([memberId, data]) => (
                    <tr key={memberId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{data.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {data.currentShift || 'Not Assigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(data.monthsPerShift || {}).map(([shiftId, months]) => (
                            <span key={shiftId} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                              {shiftId}: {months} month{months !== 1 ? 's' : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {data.lastThreeMonths?.join(' → ') || 'No history'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No members found in this team
                    </td>
                  </tr>
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