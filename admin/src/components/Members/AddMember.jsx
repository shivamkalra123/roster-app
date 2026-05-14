// frontend/src/components/Members/AddMember.jsx
import React, { useState } from 'react';
import { memberService } from '../../services/memberService';
import toast from 'react-hot-toast';

const AddMember = ({ teamId, onMemberAdded, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    baseGroup: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.name) {
      toast.error('Email and name are required');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await memberService.addMember(teamId, formData);
      if (result.success) {
        toast.success(result.message);
        onMemberAdded();
        onClose();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Add Team Member</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Base Group (Optional)</label>
              <input
                type="text"
                name="baseGroup"
                value={formData.baseGroup}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Group A"
              />
            </div>
            
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Adding...' : 'Add Member'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMember;