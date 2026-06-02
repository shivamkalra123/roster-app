// frontend/src/components/Leave/ApplyLeaveModal.jsx

import React, { useState } from 'react';
import {
  X,
  Calendar,
  FileText
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  applyLeave
} from '../../services/leaveService';

const LEAVE_TYPES = [
  {
    id: 'casual',
    label: 'Casual Leave'
  },
  {
    id: 'sick',
    label: 'Sick Leave'
  },
  {
    id: 'earned',
    label: 'Earned Leave'
  }
];

const ApplyLeaveModal = ({
  isOpen,
  onClose,
  teamId,
  onSuccess
}) => {

  const [loading, setLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      leaveType: 'casual',
      reason: '',
      startDate: '',
      endDate: ''
    });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      setLoading(true);

      if (
        !formData.leaveType ||
        !formData.reason ||
        !formData.startDate ||
        !formData.endDate
      ) {
        toast.error(
          'Please fill all fields'
        );

        return;
      }

      if (
        new Date(formData.endDate) <
        new Date(formData.startDate)
      ) {
        toast.error(
          'End date cannot be before start date'
        );

        return;
      }

      const result =
        await applyLeave({
          teamId,
          leaveType:
            formData.leaveType,
          reason:
            formData.reason,
          startDate:
            formData.startDate,
          endDate:
            formData.endDate
        });

      if (result.success) {

        toast.success(
          'Leave request submitted!'
        );

        setFormData({
          leaveType: 'casual',
          reason: '',
          startDate: '',
          endDate: ''
        });

        if (onSuccess) {
          onSuccess();
        }

        onClose();
      }

    } catch (error) {

      console.error(
        'Apply Leave Error:',
        error
      );

      toast.error(
        error?.response?.data?.error ||
        'Failed to apply leave'
      );

    } finally {

      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex justify-between items-center">

          <div className="flex items-center gap-3">

            <Calendar className="h-6 w-6 text-white" />

            <h2 className="text-xl font-bold text-white">
              Apply Leave
            </h2>

          </div>

          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <X className="h-6 w-6" />
          </button>

        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5"
        >

          {/* Leave Type */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type
            </label>

            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >

              {LEAVE_TYPES.map((type) => (

                <option
                  key={type.id}
                  value={type.id}
                >
                  {type.label}
                </option>

              ))}

            </select>

          </div>

          {/* Start Date */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>

            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

          {/* End Date */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>

            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />

          </div>

          {/* Reason */}
          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>

            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              placeholder="Write reason for leave..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />

          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50"
            >
              {loading
                ? 'Submitting...'
                : 'Apply Leave'}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;