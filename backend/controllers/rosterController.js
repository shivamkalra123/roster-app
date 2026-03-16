const RosterService = require("../services/rosterService");

class RosterController {

  static async generateRoster(req, res) {
    try {
      const { teamId, year, month } = req.body;

      if (!teamId || !year || !month) {
        return res.status(400).json({ error: "teamId, year and month required" });
      }

      const result = await RosterService.generateRoster(teamId, year, month);

      res.json(result);

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getRoster(req, res) {
    try {
      const { teamId, year, month } = req.params;

      const roster = await RosterService.getRoster(teamId, year, month);

      res.json(roster);

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = RosterController;