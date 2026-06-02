import React, {
  useEffect,
  useState
} from 'react';

import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  getTeamLeaves,
  updateLeaveStatus
} from '../../services/leaveService';

const LeaveRequests = ({
  teamId
}) => {

  const [loading, setLoading] =
    useState(false);

  const [leaves, setLeaves] =
    useState([]);

  useEffect(() => {
    if (teamId) {
      loadLeaves();
    }
  }, [teamId]);

  const loadLeaves = async () => {
    try {

      setLoading(true);

      const result =
        await getTeamLeaves(teamId);

      if (result.success) {
        setLeaves(result.leaves || []);
      }

    } catch (error) {

      console.error(
        'Load Leaves Error:',
        error
      );

      toast.error(
        'Failed to load leave requests'
      );

    } finally {

      setLoading(false);
    }
  };

  const handleStatusUpdate =
    async (
      leaveId,
      status
    ) => {

      try {

        const adminComment =
          prompt(
            `Enter ${status} comment`
          ) || '';

        const result =
          await updateLeaveStatus(
            leaveId,
            {
              status,
              adminComment
            }
          );

        if (result.success) {

          toast.success(
            `Leave ${status}`
          );

          loadLeaves();
        }

      } catch (error) {

        console.error(
          'Update Leave Error:',
          error
        );

        toast.error(
          error?.response?.data?.error ||
          'Failed to update leave'
        );
      }
    };

  const getStatusColor =
    (status) => {

      switch (status) {

        case 'approved':
          return 'bg-green-100 text-green-700';

        case 'rejected':
          return 'bg-red-100 text-red-700';

        default:
          return 'bg-yellow-100 text-yellow-700';
      }
    };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">

        <h2 className="text-xl font-bold text-white flex items-center gap-2">

          <Calendar className="h-5 w-5" />

          Leave Requests

        </h2>

      </div>

      {/* Table */}
      <div className="overflow-x-auto">

        <table className="min-w-full">

          <thead className="bg-gray-100 border-b">

            <tr>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Employee
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Leave Type
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Date Range
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Reason
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10"
                >
                  Loading...
                </td>
              </tr>

            ) : leaves.length === 0 ? (

              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-gray-500"
                >
                  No leave requests found
                </td>
              </tr>

            ) : (

              leaves.map((leave) => (

                <tr
                  key={leave.id}
                  className="border-b hover:bg-gray-50"
                >

                  {/* Employee */}
                  <td className="px-4 py-4">

                    <div>

                      <p className="font-semibold text-gray-800">
                        {leave.userName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {leave.userEmail}
                      </p>

                    </div>

                  </td>

                  {/* Leave Type */}
                  <td className="px-4 py-4">

                    <span className="capitalize font-medium text-gray-700">
                      {leave.leaveType}
                    </span>

                  </td>

                  {/* Date Range */}
                  <td className="px-4 py-4">

                    <div className="text-sm text-gray-700">

                      <div>
                        {leave.startDate}
                      </div>

                      <div className="text-gray-500">
                        to
                      </div>

                      <div>
                        {leave.endDate}
                      </div>

                    </div>

                  </td>

                  {/* Reason */}
                  <td className="px-4 py-4 max-w-xs">

                    <p className="text-sm text-gray-700">
                      {leave.reason}
                    </p>

                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                        leave.status
                      )}`}
                    >
                      {leave.status}
                    </span>

                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">

                    {leave.status ===
                    'pending' ? (

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              leave.id,
                              'approved'
                            )
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition flex items-center gap-1 text-sm"
                        >

                          <CheckCircle className="h-4 w-4" />

                          Approve

                        </button>

                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              leave.id,
                              'rejected'
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition flex items-center gap-1 text-sm"
                        >

                          <XCircle className="h-4 w-4" />

                          Reject

                        </button>

                      </div>

                    ) : (

                      <span className="text-sm text-gray-400">
                        Completed
                      </span>

                    )}

                  </td>

                </tr>

              ))
            )}

          </tbody>

        </table>

      </div>
    </div>
  );
};

export default LeaveRequests;