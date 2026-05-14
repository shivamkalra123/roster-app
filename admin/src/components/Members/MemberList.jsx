// frontend/src/components/Members/MemberList.jsx (Updated with invite actions)
import React, { useState, useEffect } from 'react';
import { memberService } from '../../services/memberService';
import { Users, Mail, UserCheck, UserX, Trash2, Send, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AddMember from './AddMember';
import BulkAddMembers from './BulkAddMembers';

const MemberList = ({ teamId }) => {
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [teamId]);

  const fetchMembers = async () => {
    try {
      const result = await memberService.getMembers(teamId);
      if (result.success) {
        setMembers(result.members || []);
        setPendingInvites(result.pendingInvites || []);
      }
    } catch (error) {
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      try {
        const result = await memberService.removeMember(teamId, memberId);
        if (result.success) {
          toast.success('Member removed successfully');
          fetchMembers();
        }
      } catch (error) {
        toast.error(error.error || 'Failed to remove member');
      }
    }
  };

  const handleResendInvite = async (email) => {
    try {
      const result = await memberService.resendInvite(teamId, email);
      if (result.success) {
        toast.success(`Invitation resent to ${email}`);
        fetchMembers();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to resend invitation');
    }
  };

  const handleCancelInvite = async (email) => {
    if (window.confirm(`Cancel invitation for ${email}?`)) {
      try {
        const result = await memberService.cancelInvite(teamId, email);
        if (result.success) {
          toast.success(`Invitation cancelled for ${email}`);
          fetchMembers();
        }
      } catch (error) {
        toast.error(error.error || 'Failed to cancel invitation');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Members</p>
              <p className="text-2xl font-bold text-gray-800">{members.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Registered</p>
              <p className="text-2xl font-bold text-green-600">{members.filter(m => m.isRegistered).length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Registration</p>
              <p className="text-2xl font-bold text-yellow-600">{members.filter(m => !m.isRegistered).length}</p>
            </div>
            <UserX className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Sent Invites</p>
              <p className="text-2xl font-bold text-purple-600">{pendingInvites.length}</p>
            </div>
            <Mail className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>
      
      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Add Single Member
          </button>
          <button onClick={() => setShowBulkModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            📊 Bulk Add Members
          </button>
        </div>
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="bg-purple-50 px-6 py-3 border-b border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800">📧 Pending Invites ({pendingInvites.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => (
                  <tr key={invite.email} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{invite.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(invite.invitedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${new Date(invite.expiresAt) > new Date() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm space-x-3">
                      <button onClick={() => handleResendInvite(invite.email)} className="text-blue-600 hover:text-blue-800" title="Resend">
                        <Send className="h-5 w-5 inline" />
                      </button>
                      <button onClick={() => handleCancelInvite(invite.email)} className="text-red-600 hover:text-red-800" title="Cancel">
                        <XCircle className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Team Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-blue-50 px-6 py-3 border-b border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800">👥 Team Members ({members.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.email}</td>
                  <td className="px-6 py-4">
                    {member.isRegistered ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">✓ Registered</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">⏳ Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.memberData?.baseGroup || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleRemoveMember(member.userId, member.name)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modals */}
      {showAddModal && <AddMember teamId={teamId} onMemberAdded={fetchMembers} onClose={() => setShowAddModal(false)} />}
      {showBulkModal && <BulkAddMembers teamId={teamId} onMembersAdded={fetchMembers} onClose={() => setShowBulkModal(false)} />}
    </div>
  );
};

export default MemberList;