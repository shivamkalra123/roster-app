// admin/src/components/Team/MemberShiftAssignment.jsx
import React, { useState } from 'react';
import { updateMemberShiftAssignment } from '../../services/rosterService';
import { Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

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
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-800">{member.name}</h4>
          <p className="text-sm text-gray-500">{member.email}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedShiftId}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition flex items-center gap-1 text-sm disabled:opacity-50"
        >
          <Save className="h-3 w-3" />
          {saving ? 'Saving...' : 'Assign Shift'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <select
          value={selectedShiftId}
          onChange={(e) => setSelectedShiftId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Shift --</option>
          {availableShifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.name} ({shift.startTime} - {shift.endTime})
            </option>
          ))}
        </select>

        {selectedShift && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <Clock className="h-4 w-4" />
            <span>Timings: {selectedShift.startTime} - {selectedShift.endTime}</span>
          </div>
        )}

        {member.assignedShiftId && member.assignedShiftId !== selectedShiftId && (
          <p className="text-xs text-yellow-600">
            Current: {member.assignedShiftName} ({member.assignedShiftTimings})
          </p>
        )}
      </div>
    </div>
  );
};

export default MemberShiftAssignment;