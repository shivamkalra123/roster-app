// admin/src/components/Roster/RosterManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Download, 
  Save, 
  Eye, 
  Trash2,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  ArrowLeftRight,
  Calendar
} from 'lucide-react';
import { 
  previewRoster, 
  confirmRoster, 
  getRoster, 
  deleteRoster,
  getShiftConfig,
  updateShiftConfig,
  getShiftFrequencyTable,
  getAvailableSwapUsers,
  swapShifts,
  getSwapHistory,
  revertSwap
} from '../../services/rosterService';
import ShiftFrequencyTable from './ShiftFrequencyTable';
import ShiftSwapModal from './ShiftSwapModal';
import RosterCalendar from '../../../../shared/components/RosterCalendar';
import LeaveRequests from '../Leave/LeaveRequests';
import toast from 'react-hot-toast';
import RosterViewer from '../../../../shared/components/RosterViewer';

const RosterManagement = ({ teamId }) => {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster', 'leaveRequests', 'settings'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const today = new Date();

const getDefaultRosterDates = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0]
  };
};

const defaults = getDefaultRosterDates(
  selectedYear,
  selectedMonth
);

const [rosterStartDate, setRosterStartDate] = useState(defaults.start);
const [rosterEndDate, setRosterEndDate] = useState(defaults.end);
  const [loading, setLoading] = useState(false);
  const [rosterData, setRosterData] = useState(null);
  const [rosterArray, setRosterArray] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [showFrequencyTable, setShowFrequencyTable] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showSwapHistory, setShowSwapHistory] = useState(false);
  const [swapHistory, setSwapHistory] = useState([]);
  const [selectedSwapTarget, setSelectedSwapTarget] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, member: null, day: null });
  const [shiftConfig, setShiftConfig] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);







  useEffect(() => {
    loadShiftConfig();
  }, [teamId]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, member: null, day: null });
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
  const defaults = getDefaultRosterDates(
    selectedYear,
    selectedMonth
  );

  setRosterStartDate(defaults.start);
  setRosterEndDate(defaults.end);
}, [selectedYear, selectedMonth]);

  const loadShiftConfig = async () => {
    try {
      const result = await getShiftConfig(teamId);
      if (result.success) {
        setShiftConfig(result.config);
        setEditingConfig(JSON.parse(JSON.stringify(result.config)));
      }
    } catch (error) {
      console.error('Failed to load shift config:', error);
    }
  };

  const processRosterData = (data) => {
    const roster =
  data.roster?.roster ??
  data.roster ??
  {};
    const days = Object.keys(roster).sort(
  (a, b) => new Date(a) - new Date(b)
);
    
    const memberMap = new Map();
    days.forEach(day => {
      const dayAssignments = roster[day] || [];
      dayAssignments.forEach(assignment => {
        if (!memberMap.has(assignment.userId)) {
          memberMap.set(assignment.userId, {
            userId: assignment.userId,
            name: assignment.name,
            isWeekendWorker: assignment.isWeekendWorker || false
          });
        }
      });
    });
    
    const members = Array.from(memberMap.values());
    members.sort((a, b) => a.name.localeCompare(b.name));
    setMembersList(members);
    
    const rosterGrid = members.map(member => {
      const memberSchedule = {};
      const memberShiftDetails = {};
      days.forEach(day => {
        const dayAssignments = roster[day] || [];
        const memberAssignment = dayAssignments.find(a => a.userId === member.userId);
        memberSchedule[day] = memberAssignment?.shift || "OFF";
        memberShiftDetails[day] = memberAssignment || null;
      });
      
      const shiftCounts = {};
      Object.values(memberSchedule).forEach(shift => {
        if (shift !== "OFF") {
          shiftCounts[shift] = (shiftCounts[shift] || 0) + 1;
        }
      });
      
      return {
        memberId: member.userId,
        memberName: member.name,
        schedule: memberSchedule,
        shiftDetails: memberShiftDetails,
        shiftCounts,
        isWeekendWorker: member.isWeekendWorker
      };
    });
    
    setRosterArray(rosterGrid);
  };

  const handlePreviewRoster = async () => {
    const start = new Date(rosterStartDate);
const end = new Date(rosterEndDate);

if (start > end) {
  toast.error("Roster start date cannot be after end date.");
  return;
}


    setLoading(true);
    try {
      const result = await previewRoster(teamId, selectedYear, selectedMonth,rosterStartDate,rosterEndDate);
      if (result.success) {
        setRosterData(result);
        processRosterData(result);
        setShowPreview(true);
        toast.success('Roster preview generated!');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRoster = async () => {
    if (!window.confirm('Are you sure you want to confirm and save this roster?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await confirmRoster(teamId, selectedYear, selectedMonth, rosterStartDate, rosterEndDate);
      if (result.success) {
        toast.success('Roster confirmed and saved successfully!');
        await loadExistingRoster();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to confirm roster');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingRoster = async () => {
    try {
      const result = await getRoster(teamId, selectedYear, selectedMonth);

      console.log("Loaded roster:", result);

      setRosterData(result);
      processRosterData(result);
      setShowPreview(true);
      

   
      if (result.success) {
        setRosterData(result);
        processRosterData(result);
        setShowPreview(true);
      }
    } catch (error) {
      setRosterData(null);
      setShowPreview(false);
    }
  };

  const handleDeleteRoster = async () => {
    if (!window.confirm('Are you sure you want to delete this roster? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteRoster(teamId, selectedYear, selectedMonth);
      if (result.success) {
        toast.success('Roster deleted successfully');
        setRosterData(null);
        setShowPreview(false);
        setRosterArray([]);
        setMembersList([]);
      }
    } catch (error) {
      toast.error(error.error || 'Failed to delete roster');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShiftConfig = async () => {
    setLoading(true);
    try {
      const result = await updateShiftConfig(teamId, editingConfig);
      if (result.success) {
        setShiftConfig(editingConfig);
        setShowShiftConfig(false);
        toast.success('Shift configuration updated successfully!');
      }
    } catch (error) {
      toast.error(error.error || 'Failed to update shift configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRightClick = (e, member, day) => {
    e.preventDefault();
    const shift = member.schedule[day];
    if (shift !== 'OFF') {
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        member: member,
        day: day
      });
    }
  };

  const handleSwapClick = () => {
    setSelectedSwapTarget({
      userId: contextMenu.member.memberId,
      name: contextMenu.member.memberName,
      currentShift: contextMenu.member.schedule[contextMenu.day]
    });
    setSelectedDay(contextMenu.day);
    setShowSwapModal(true);
    setContextMenu({ show: false, x: 0, y: 0, member: null, day: null });
  };

  const handleViewSwapHistory = async () => {
    try {
      const result = await getSwapHistory(teamId, selectedYear, selectedMonth);
      if (result.success) {
        setSwapHistory(result.swapHistory);
        setShowSwapHistory(true);
      }
    } catch (error) {
      toast.error('Failed to load swap history');
    }
  };

  const handleSwapComplete = async () => {
    await loadExistingRoster();
    toast.success('Shift swap completed!');
  };

  const handleRevertSwap = async (swapId) => {
    if (!window.confirm('Are you sure you want to revert this swap?')) return;
    
    setLoading(true);
    try {
      const result = await revertSwap(teamId, selectedYear, selectedMonth, swapId, 'admin@example.com');
      if (result.success) {
        toast.success('Swap reverted successfully');
        await loadExistingRoster();
        await handleViewSwapHistory();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to revert swap');
    } finally {
      setLoading(false);
    }
  };

  const getShiftColor = (shiftType) => {
    const colors = {
      morning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      evening: 'bg-orange-100 text-orange-800 border-orange-200',
      night: 'bg-purple-100 text-purple-800 border-purple-200',
      OFF: 'bg-gray-100 text-gray-500 border-gray-200'
    };
    return colors[shiftType] || 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getShiftIcon = (shiftType) => {
    const icons = {
      morning: '🌅',
      evening: '🌇',
      night: '🌙',
      OFF: '❌'
    };
    return icons[shiftType] || '🕒';
  };

  const getRosterDays = () => {
  const start = new Date(rosterStartDate);
  const end = new Date(rosterEndDate);

  const rosterDays = [];

  let current = new Date(start);

  while (current <= end) {
    rosterDays.push({
      key: current.toISOString().split("T")[0],
      day: current.getDate(),
      month: current.getMonth() + 1,
      year: current.getFullYear(),
      date: new Date(current),
      label: current.toLocaleDateString("default", {
        day: "numeric",
        month: "short"
      })
    });

    current.setDate(current.getDate() + 1);
  }

  return rosterDays;
};

const days = getRosterDays();
  const loadFrequencyTable = async () => {
    try {
      const result = await getShiftFrequencyTable(teamId);
      if (result.success) {
        setShowFrequencyTable(true);
      }
    } catch (error) {
      toast.error('Failed to load frequency data');
    }
  };

  const updateDailyRequirement = (day, shiftId, value) => {
    const newRequirements = { ...editingConfig.dailyRequirements };
    newRequirements[day] = {
      ...newRequirements[day],
      [shiftId]: parseInt(value) || 0
    };
    setEditingConfig({
      ...editingConfig,
      dailyRequirements: newRequirements
    });
  };

  const updateWeekendStaffCount = (value) => {
    setEditingConfig({
      ...editingConfig,
      weekendStaffCount: parseInt(value) || 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 items-end">

  {/* Year */}
  <div className="w-40">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Roster Year
    </label>

    <select
      value={selectedYear}
      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    >
      {[2024, 2025, 2026, 2027].map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </div>

  {/* Month */}
  <div className="w-48">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Roster Month
    </label>

    <select
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    >
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
        <option key={month} value={month}>
          {new Date(2000, month - 1, 1).toLocaleString("default", {
            month: "long",
          })}
        </option>
      ))}
    </select>
  </div>

  {/* Start Date */}
  <div className="w-52">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Roster Start Date
    </label>

    <input
      type="date"
      value={rosterStartDate}
      onChange={(e) => setRosterStartDate(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>

  {/* End Date */}
  <div className="w-52">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Roster End Date
    </label>

    <input
      type="date"
      value={rosterEndDate}
      onChange={(e) => setRosterEndDate(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>

  {/* Preview */}
  <button
    onClick={handlePreviewRoster}
    disabled={loading}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
  >
    <Eye className="h-4 w-4" />
    {loading ? "Generating..." : "Preview Roster"}
  </button>

  {/* Load */}
  <button
    onClick={loadExistingRoster}
    disabled={loading}
    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2"
  >
    <RefreshCw className="h-4 w-4" />
    Load Existing
  </button>

  {rosterData && (
    <>
      <button
        onClick={handleConfirmRoster}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        Confirm & Save
      </button>

      <button
        onClick={handleDeleteRoster}
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      <button
        onClick={handleViewSwapHistory}
        disabled={loading}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Swap History
      </button>
    </>
  )}

</div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg">
        <nav className="flex gap-8 px-6">
          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3 px-1 font-medium text-sm transition flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            Roster Management
          </button>
          <button
            onClick={() => setActiveTab('leaveRequests')}
            className={`py-3 px-1 font-medium text-sm transition flex items-center gap-2 ${
              activeTab === 'leaveRequests'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Leave Requests
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-1 font-medium text-sm transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            
          </button>
        </nav>
      </div>

      {/* Calendar Roster View */}
      {showPreview && rosterData && (

  <RosterViewer

    roster={rosterData}

    rows={rosterArray}

    shiftConfig={shiftConfig}

    showDownloadButton

  />

)}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed bg-white border rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="py-1">
            <div className="px-4 py-2 border-b bg-gray-50">
              <p className="text-xs text-gray-500">Swap shift for:</p>
              <p className="text-sm font-semibold">{contextMenu.member?.memberName}</p>
              <p className="text-xs text-gray-600">Day {contextMenu.day} • {getDayOfWeek(selectedYear, selectedMonth, contextMenu.day)}</p>
            </div>
            <button
              onClick={handleSwapClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition flex items-center gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap with another user
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating roster schedule...</p>
        </div>
      )}

      {/* Shift Swap Modal */}
      <ShiftSwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        teamId={teamId}
        year={selectedYear}
        month={selectedMonth}
        day={selectedDay}
        targetUser={selectedSwapTarget}
        onSwapComplete={handleSwapComplete}
      />

      {/* Swap History Modal */}
      {showSwapHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Shift Swap History
                </h3>
                <button onClick={() => setShowSwapHistory(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              
              {swapHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No swaps have been made for this roster yet.</p>
              ) : (
                <div className="space-y-3">
                  {swapHistory.map((swap, index) => (
                    <div key={swap.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {swap.type === 'shift_swap' ? 'Shift Swap' : 'Off Day Swap'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Day {swap.day} • {new Date(swap.timestamp).toLocaleString()}
                          </p>
                          {swap.type === 'shift_swap' ? (
                            <p className="text-sm mt-2">
                              <span className="font-medium">{swap.userId1}</span> 
                              {' '}({swap.oldShift1} → {swap.newShift1}) ↔ {' '}
                              <span className="font-medium">{swap.userId2}</span>
                              {' '}({swap.oldShift2} → {swap.newShift2})
                            </p>
                          ) : (
                            <p className="text-sm mt-2">
                              <span className="font-medium">{swap.userIdTakingShift}</span> 
                              {' '}took {swap.shift} shift from {' '}
                              <span className="font-medium">{swap.userIdTakingOff}</span>
                            </p>
                          )}
                          {swap.reason && <p className="text-xs text-gray-500 mt-1">Reason: {swap.reason}</p>}
                          <p className="text-xs text-gray-400 mt-1">Swapped by: {swap.swappedBy}</p>
                        </div>
                        {!swap.reverted && (
                          <button
                            onClick={() => handleRevertSwap(swap.id)}
                            className="text-red-600 hover:text-red-800 text-sm px-3 py-1 border border-red-300 rounded hover:bg-red-50 transition"
                          >
                            Revert Swap
                          </button>
                        )}
                        {swap.reverted && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            Reverted on {new Date(swap.revertedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shift Configuration Modal */}
      {showShiftConfig && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Shift Configuration</h3>
                <button onClick={() => setShowShiftConfig(false)} className="text-gray-500 hover:text-gray-700">×</button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Weekend Workers</label>
                <p className="text-xs text-gray-500 mb-2">These workers will work Monday-Wednesday + Saturday-Sunday and get Thursday-Friday off.</p>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editingConfig.weekendStaffCount || 3}
                  onChange={(e) => updateWeekendStaffCount(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Daily Shift Requirements</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Day</th>
                        {editingConfig.shifts.map((shift) => (
                          <th key={shift.id} className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                            <div className="flex flex-col">
                              <span>{shift.name}</span>
                              <span className="text-xs text-gray-400">{shift.id}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <tr key={day}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{day}</td>
                          {editingConfig.shifts.map((shift) => (
                            <td key={shift.id} className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={editingConfig.dailyRequirements?.[day]?.[shift.id] || 0}
                                onChange={(e) => updateDailyRequirement(day, shift.id, e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveShiftConfig} disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
                <button onClick={() => setShowShiftConfig(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shift Frequency Table Modal */}
      {showFrequencyTable && (
        <ShiftFrequencyTable teamId={teamId} onClose={() => setShowFrequencyTable(false)} />
      )}
    </div>
  );
};

export default RosterManagement;
