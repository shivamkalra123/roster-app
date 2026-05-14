// frontend/src/components/Members/BulkAddMembers.jsx
import React, { useState } from 'react';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';

const BulkAddMembers = ({ teamId, onMembersAdded, onClose }) => {
  const [membersText, setMembersText] = useState('');
  const [loading, setLoading] = useState(false);

  const parseMembers = () => {
    const lines = membersText.split('\n');
    const members = [];
    
    for (const line of lines) {
      const [email, name, baseGroup] = line.split(',').map(s => s.trim());
      if (email && name) {
        members.push({ email, name, baseGroup: baseGroup || null });
      }
    }
    
    return members;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const members = parseMembers();
    
    if (members.length === 0) {
      toast.error('No valid members found');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await memberService.bulkAddMembers(teamId, members);
      if (result.success) {
        toast.success(result.message);
        onMembersAdded();
        onClose();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Bulk Add Members</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Member List
              </label>
              <textarea
                value={membersText}
                onChange={(e) => setMembersText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                rows="8"
                placeholder="Format: email, name, baseGroup (optional)&#10;john@example.com, John Doe, Group A&#10;jane@example.com, Jane Smith, Group B&#10;bob@example.com, Bob Johnson"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter one member per line in the format: email, name, baseGroup (optional)
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : `Add Members (${parseMembers().length})`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
          
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 Tip: You can copy from Excel/Google Sheets and paste directly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddMembers;