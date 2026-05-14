// admin/src/components/Roster/ShiftFrequencyTable.jsx
import React, { useState, useEffect } from 'react';
import { BarChart3, Download, X } from 'lucide-react';
import { getShiftConfig, getShiftFrequencyTable } from '../../services/rosterService';
import toast from 'react-hot-toast';

const ShiftFrequencyTable = ({ teamId, onClose }) => {
  const [frequencyData, setFrequencyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load shift config
      const configResult = await getShiftConfig(teamId);
      if (configResult.success) {
        setShifts(configResult.config?.shifts || []);
      }
      
      // Load frequency table
      const frequencyResult = await getShiftFrequencyTable(teamId);
      if (frequencyResult.success) {
        setFrequencyData(frequencyResult.table || []);
      }
    } catch (error) {
      console.error('Failed to load frequency data:', error);
      toast.error('Failed to load shift frequency data');
    } finally {
      setLoading(false);
    }
  };

  const getShiftColor = (shiftId) => {
    const colors = {
      morning: 'bg-yellow-100 text-yellow-800',
      evening: 'bg-orange-100 text-orange-800',
      night: 'bg-purple-100 text-purple-800'
    };
    return colors[shiftId] || 'bg-gray-100 text-gray-800';
  };

  const handleExport = () => {
    // Create CSV data
    const headers = ['Member', 'Email', ...shifts.map(s => s.name), 'Total Shifts', 'Weekend Assignments'];
    const rows = frequencyData.map(member => [
      member.name,
      member.email,
      ...shifts.map(s => member.shiftCounts?.[s.id] || 0),
      member.totalShifts || 0,
      member.weekendAssignments || 0
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-frequency-${teamId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export started!');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading frequency data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Shift Frequency Table
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                How many times each person has worked each shift type
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  {shifts.map(shift => (
                    <th key={shift.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {shift.name}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekends
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {frequencyData.map((member) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </td>
                    {shifts.map(shift => (
                      <td key={shift.id} className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getShiftColor(shift.id)}`}>
                          {member.shiftCounts?.[shift.id] || 0}
                        </span>
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {member.totalShifts || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {member.weekendAssignments || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {frequencyData.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No shift data available yet</p>
              <p className="text-sm text-gray-400 mt-1">Generate and confirm rosters to see frequency data</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Close
            </button>
            <button
              onClick={handleExport}
              disabled={frequencyData.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftFrequencyTable;