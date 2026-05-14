// frontend/src/components/Roster/ShiftSwapModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ShiftSwapModal = ({ isOpen, onClose, teamId, year, month, day, targetUser, onSwapComplete }) => {
  const [availableUsers, setAvailableUsers] = useState({ workingUsers: [], offUsers: [] });
  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && targetUser) {
      fetchAvailableUsers();
    }
  }, [isOpen, targetUser]);

  const fetchAvailableUsers = async () => {
    setError(null);
    try {
      const url = `/roster/${teamId}/${year}/${month}/${day}/swap-available/${targetUser.userId}`;
      console.log('🚀 Fetching available users from:', url);
      
      const response = await api.get(url);
      console.log('✅ Response received:', response.data);
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('❌ Error fetching available users:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || error.message || 'Failed to fetch available users');
    }
  };

  const handleSwap = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `/roster/${teamId}/${year}/${month}/${day}/swap`;
      console.log('🔄 Swapping shifts via:', url);
      console.log('Data:', {
        userId1: targetUser.userId,
        userId2: selectedUser.userId,
        swappedBy: localStorage.getItem('userEmail') || 'admin',
        reason: reason
      });
      
      const response = await api.post(url, {
        userId1: targetUser.userId,
        userId2: selectedUser.userId,
        swappedBy: localStorage.getItem('userEmail') || 'admin',
        reason: reason
      });
      
      console.log('✅ Swap response:', response.data);
      
      if (response.data.success) {
        toast.success('Shift swapped successfully!');
        onSwapComplete();
        onClose();
      } else {
        throw new Error(response.data.error || 'Swap failed');
      }
    } catch (error) {
      console.error('❌ Error swapping shifts:', error);
      setError(error.response?.data?.error || error.message || 'Failed to swap shifts');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Swap Shift</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={fetchAvailableUsers}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="mb-4">
          <p className="text-gray-600">
            Current assignment: <strong>{targetUser?.name}</strong> - {targetUser?.currentShift} shift
          </p>
        </div>
        
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Available Users to Swap With:</h3>
          
          {!error && availableUsers.workingUsers?.length === 0 && availableUsers.offUsers?.length === 0 && (
            <p className="text-gray-500 text-center py-4">Loading available users...</p>
          )}
          
          {availableUsers.workingUsers?.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Currently Working:</p>
              {availableUsers.workingUsers.map(user => (
                <div
                  key={user.userId}
                  className={`p-2 border rounded mb-2 cursor-pointer hover:bg-gray-50 ${
                    selectedUser?.userId === user.userId ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">Current: {user.currentShift} shift</div>
                  {!user.canSwap && (
                    <div className="text-xs text-red-500">⚠️ Incompatible shift swap</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {availableUsers.offUsers?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Currently Off:</p>
              {availableUsers.offUsers.map(user => (
                <div
                  key={user.userId}
                  className={`p-2 border rounded mb-2 cursor-pointer hover:bg-gray-50 ${
                    selectedUser?.userId === user.userId ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">Status: OFF</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Swap (Optional)
          </label>
          <textarea
            className="w-full border rounded p-2"
            rows="2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for this shift swap..."
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            disabled={!selectedUser || loading}
            className={`px-4 py-2 rounded text-white ${
              !selectedUser || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Swapping...' : 'Confirm Swap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftSwapModal;