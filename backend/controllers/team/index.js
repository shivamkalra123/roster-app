// backend/controllers/team/index.js
const createTeam = require('./createTeam');
const addTeamMember = require('./addTeamMember');
const bulkAddMembers = require('./bulkAddMembers');
const acceptInvite = require('./acceptInvite');
const removeTeamMember = require('./removeTeamMember');
const getTeams = require('./getTeams');
const getTeam = require('./getTeam');
const getTeamMembers = require('./getTeamMembers');
const getTeamMember = require('./getTeamMember');
const updateTeamMember = require('./updateTeamMember');
const rebuildShiftCounts = require('./rebuildShiftCounts');
const resendInvite = require('./resendInvite');
const cancelInvite = require('./cancelInvite');

module.exports = {
  createTeam,
  addTeamMember,
  bulkAddMembers,
  acceptInvite,
  removeTeamMember,
  getTeams,
  getTeam,
  getTeamMembers,
  getTeamMember,
  updateTeamMember,
  rebuildShiftCounts,
  resendInvite,
  cancelInvite
};