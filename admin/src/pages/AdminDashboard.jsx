// frontend/src/components/AdminDashboard.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import { getShifts, previewRoster, confirmRoster } from "../services/rosterService";
import { memberService } from "../services/memberService";

const shiftLabels = {
  morning: "🌅 Morning",
  evening: "🌇 Evening",
  night: "🌙 Night",
  OFF: "❌ Off",
};

const AdminDashboard = ({ teamId }) => {
  const [year] = useState(2026);
  const [month] = useState(4);
  const [roster, setRoster] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [admins, setAdmins] = useState({});
  const [loading, setLoading] = useState(true);

  // Load shifts, members, and pending invites
  useEffect(() => {
    if (!teamId) return;
    loadShifts();
    loadTeamData();
  }, [teamId]);

  const loadShifts = async () => {
    try {
      const data = await getShifts(teamId);
      setShifts(data.shifts || []);
    } catch (error) {
      console.error("Failed to load shifts:", error);
    }
  };

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const data = await memberService.getMembers(teamId);
      
      // Separate members and pending invites
      const allMembers = data.members || [];
      const pending = data.pendingInvites || [];
      
      setMembers(allMembers);
      setPendingInvites(pending);
      
      // Load admin details for both members and pending invites
      const allAddedBy = [
        ...allMembers.map(m => m.addedBy),
        ...pending.map(p => p.addedBy)
      ].filter(Boolean);
      
      const uniqueAdminIds = [...new Set(allAddedBy)];
      await loadAdminDetails(uniqueAdminIds);
      
    } catch (error) {
      console.error("Failed to load team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminDetails = async (adminIds) => {
    for (const adminId of adminIds) {
      if (!admins[adminId]) {
        try {
          const response = await api.get(`/admins/${adminId}`);
          const data = response.data;
          if (data.success) {
            setAdmins(prev => ({
              ...prev,
              [adminId]: data.admin
            }));
          }
        } catch (error) {
          console.error(`Failed to load admin ${adminId}:`, error);
          setAdmins(prev => ({
            ...prev,
            [adminId]: { email: 'Unknown', name: 'Unknown Admin' }
          }));
        }
      }
    }
  };

  const getInviterName = (addedBy) => {
    if (!addedBy) return "System";
    const admin = admins[addedBy];
    return admin?.name || admin?.email || addedBy.slice(0, 8);
  };

  // Resend invitation
  const resendInvitation = async (email) => {
    try {
      const data = await memberService.resendInvite(teamId, email);
      if (data.success) {
        alert(`✅ Invitation resent to ${email}`);
        loadTeamData(); // Refresh
      } else {
        alert(data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert('Failed to resend invitation');
    }
  };

  // Cancel invitation
  const cancelInvitation = async (email) => {
    if (!window.confirm(`Cancel invitation for ${email}?`)) return;
    
    try {
      const data = await memberService.cancelInvite(teamId, email);
      if (data.success) {
        alert(`✅ Invitation cancelled for ${email}`);
        loadTeamData(); // Refresh
      } else {
        alert(data.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      alert('Failed to cancel invitation');
    }
  };

  // Roster Actions
  const preview = async () => {
    try {
      const data = await previewRoster(teamId, year, month);
      setRoster(data.roster);
    } catch (error) {
      console.error("Preview failed:", error);
      alert("Failed to preview roster");
    }
  };

  const confirm = async () => {
    try {
      await confirmRoster(teamId, year, month);
      alert("✅ Roster confirmed and saved!");
    } catch (error) {
      console.error("Confirm failed:", error);
      alert("Failed to confirm roster");
    }
  };

  const publish = async () => {
    try {
      await confirmRoster(teamId, year, month);
      alert("🚀 Roster published!");
    } catch (error) {
      console.error("Publish failed:", error);
      alert("Failed to publish roster");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Shift Timings Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Shift Timings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {shifts.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="font-medium">{shiftLabels[s.id] || s.id}:</span>
              <span>{s.startTime} - {s.endTime}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PENDING INVITES SECTION */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3 flex items-center justify-between">
          <span>
            📧 Pending Invites 
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              {pendingInvites.length}
            </span>
          </span>
        </h2>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : pendingInvites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending invites. All invitations have been accepted.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited On</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingInvites.map((invite) => (
                  <tr key={invite.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{invite.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getInviterName(invite.addedBy)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {invite.invitedAt ? new Date(invite.invitedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        new Date(invite.expiresAt) > new Date() 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-3">
                      <button
                        onClick={() => resendInvitation(invite.email)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => cancelInvitation(invite.email)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTERED MEMBERS SECTION */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">
          👥 Registered Members 
          <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {members.filter(m => m.isRegistered).length}
          </span>
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined On</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Group</th>
               </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.filter(m => m.isRegistered).map((member) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getInviterName(member.addedBy)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {member.addedAt ? new Date(member.addedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {member.memberData?.baseGroup || '-'}
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>
            {members.filter(m => m.isRegistered).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No registered members yet.
              </div>
            )}
          </div>
        </div>

        {/* PENDING REGISTRATION SECTION (invited but haven't registered) */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">
            ⏳ Pending Registration 
            <span className="ml-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
              {members.filter(m => !m.isRegistered).length}
            </span>
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited On</th>
                 </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.filter(m => !m.isRegistered).map((member) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getInviterName(member.addedBy)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {member.addedAt ? new Date(member.addedAt).toLocaleDateString() : '-'}
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>
            {members.filter(m => !m.isRegistered).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No pending registrations. All invited users have joined.
              </div>
            )}
          </div>
        </div>

        {/* Roster Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">📅 Roster Actions</h2>
          <div className="flex gap-3">
            <button
              onClick={preview}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Preview Roster
            </button>
            <button
              onClick={confirm}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Confirm & Save
            </button>
            <button
              onClick={publish}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Publish Roster
            </button>
          </div>
        </div>

        {/* Roster Display */}
        {roster && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">
              📊 Roster - {new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })} {year}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(roster).map((day) => (
                <div key={day} className="border rounded-lg p-3 bg-gray-50">
                  <h3 className="font-bold text-lg mb-2 border-b pb-1">Day {day}</h3>
                  {roster[day].map((r, i) => (
                    <div key={i} className="text-sm py-1 flex justify-between">
                      <span className="font-medium">{r.name}</span>
                      <span>{shiftLabels[r.shift] || r.shift}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
};

export default AdminDashboard;
